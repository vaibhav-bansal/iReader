// Supabase Edge Function: billing
// Handles webhook events from payment providers (Dodo Payments, Stripe, etc.) for subscriptions and payments

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get webhook event data
    const payload = await req.json()
    console.log('Received webhook event:', payload.type)
    console.log('Full payload structure:', JSON.stringify(payload, null, 2))

    // Verify webhook signature (Dodo Payments specific)
    const signature = req.headers.get('x-dodo-signature')
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET')

    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Route to appropriate handler based on event type
    const eventType = payload.type
    let result

    // Subscription events
    if (eventType.startsWith('subscription.')) {
      result = await handleSubscriptionEvent(supabaseClient, payload)
    }
    // Payment events
    else if (eventType.startsWith('payment.')) {
      result = await handlePaymentEvent(supabaseClient, payload)
    }
    else {
      console.warn('Unhandled event type:', eventType)
      return new Response(
        JSON.stringify({ received: true, message: 'Event type not handled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ received: true, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

// Verify Dodo Payments webhook signature
function verifyWebhookSignature(payload: any, signature: string | null, secret: string | undefined): boolean {
  // TODO: Implement Dodo Payments signature verification
  // This is a placeholder - replace with actual Dodo verification logic
  // Reference: https://docs.dodopayments.com/webhooks/verification

  if (!signature || !secret) {
    console.warn('Webhook signature verification disabled (missing secret)')
    return true // Allow for testing - remove in production
  }

  // Example verification (replace with actual Dodo method):
  // const expectedSignature = crypto.createHmac('sha256', secret)
  //   .update(JSON.stringify(payload))
  //   .digest('hex')
  // return signature === expectedSignature

  return true // Placeholder
}

// Handle subscription-related events
async function handleSubscriptionEvent(supabase: any, payload: any) {
  const eventType = payload.type
  const subscriptionData = payload.data // Dodo sends data directly

  console.log('Handling subscription event:', eventType, 'Data:', subscriptionData)

  // Extract subscription fields (Dodo structure)
  const dodoSubscriptionId = subscriptionData.subscription_id
  const dodoCustomerId = subscriptionData.customer?.customer_id
  const userId = subscriptionData.metadata?.user_id
  const tier = subscriptionData.metadata?.tier || 'pro'
  const currentPeriodStart = new Date(subscriptionData.previous_billing_date)
  const currentPeriodEnd = new Date(subscriptionData.next_billing_date)
  const cancelAtPeriodEnd = subscriptionData.cancel_at_next_billing_date || false

  if (!userId) {
    throw new Error('user_id not found in subscription metadata')
  }

  switch (eventType) {
    case 'subscription.created':
    case 'subscription.active':
    case 'subscription.renewed':
      // First, deactivate any existing active subscriptions for this user
      // This handles the UNIQUE(user_id, status) constraint
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', cancel_at_period_end: true })
        .eq('user_id', userId)
        .eq('status', 'active')
        .neq('dodo_subscription_id', dodoSubscriptionId)

      // Create or update subscription record (upsert on dodo_subscription_id)
      const { data: newSub, error: createError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          tier,
          status: 'active',
          dodo_subscription_id: dodoSubscriptionId,
          dodo_customer_id: dodoCustomerId,
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          cancel_at_period_end: cancelAtPeriodEnd,
        }, {
          onConflict: 'dodo_subscription_id'
        })
        .select()

      if (createError) throw createError
      console.log('Subscription upserted:', newSub)
      return newSub

    case 'subscription.updated':
      // Update existing subscription
      const status = mapDodoStatusToOurStatus(subscriptionData.status)
      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status,
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          cancel_at_period_end: cancelAtPeriodEnd,
        })
        .eq('dodo_subscription_id', dodoSubscriptionId)
        .select()

      if (updateError) throw updateError
      console.log('Subscription updated:', updatedSub)
      return updatedSub

    case 'subscription.cancelled':
      // Mark subscription as cancelled
      const { data: cancelledSub, error: cancelError } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
        })
        .eq('dodo_subscription_id', dodoSubscriptionId)
        .select()

      if (cancelError) throw cancelError
      console.log('Subscription cancelled:', cancelledSub)
      return cancelledSub

    case 'subscription.expired':
      // Mark subscription as expired
      const { data: expiredSub, error: expireError } = await supabase
        .from('subscriptions')
        .update({
          status: 'expired',
        })
        .eq('dodo_subscription_id', dodoSubscriptionId)
        .select()

      if (expireError) throw expireError
      console.log('Subscription expired:', expiredSub)
      return expiredSub

    case 'subscription.trial_ending':
      // Optional: Send notification to user
      console.log('Subscription trial ending:', dodoSubscriptionId)
      return { message: 'Trial ending notification logged' }

    default:
      console.warn('Unhandled subscription event:', eventType)
      return { message: 'Event logged but not handled' }
  }
}

// Handle payment-related events
async function handlePaymentEvent(supabase: any, payload: any) {
  const eventType = payload.type
  const paymentData = payload.data // Dodo sends data directly

  console.log('Handling payment event:', eventType, 'Data:', paymentData)

  // Extract payment fields (Dodo structure)
  const dodoPaymentId = paymentData.payment_id
  const dodoSubscriptionId = paymentData.subscription_id
  const amount = paymentData.total_amount / 100 // Dodo sends in cents, convert to dollars
  const currency = paymentData.currency || 'USD'
  const paymentMethod = paymentData.payment_method
  const userId = paymentData.metadata?.user_id
  const createdAt = new Date(paymentData.created_at)

  if (!userId) {
    throw new Error('user_id not found in payment metadata')
  }

  // Get subscription_id from our database
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('dodo_subscription_id', dodoSubscriptionId)
    .single()

  switch (eventType) {
    case 'payment.succeeded':
      // Create successful payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          subscription_id: subscription?.id,
          dodo_payment_id: dodoPaymentId,
          dodo_subscription_id: dodoSubscriptionId,
          amount,
          currency,
          status: 'succeeded',
          payment_method: paymentMethod,
          paid_at: createdAt.toISOString(),
          metadata: paymentData,
        })
        .select()

      if (paymentError) throw paymentError
      console.log('Payment succeeded:', payment)
      return payment

    case 'payment.failed':
      // Create failed payment record
      const { data: failedPayment, error: failError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          subscription_id: subscription?.id,
          dodo_payment_id: dodoPaymentId,
          dodo_subscription_id: dodoSubscriptionId,
          amount,
          currency,
          status: 'failed',
          payment_method: paymentMethod,
          failure_reason: paymentData.failure_message || 'Payment failed',
          metadata: paymentData,
        })
        .select()

      if (failError) throw failError
      console.log('Payment failed:', failedPayment)
      return failedPayment

    case 'payment.refunded':
      // Update payment status to refunded
      const { data: refundedPayment, error: refundError } = await supabase
        .from('payments')
        .update({
          status: 'refunded',
        })
        .eq('dodo_payment_id', dodoPaymentId)
        .select()

      if (refundError) throw refundError
      console.log('Payment refunded:', refundedPayment)
      return refundedPayment

    default:
      console.warn('Unhandled payment event:', eventType)
      return { message: 'Event logged but not handled' }
  }
}

// Map Dodo payment status to our status
function mapDodoStatusToOurStatus(dodoStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    'past_due': 'active', // Keep active but payment failed
    'unpaid': 'active',
    'incomplete': 'trialing',
    'incomplete_expired': 'expired',
    'trialing': 'trialing',
  }
  return statusMap[dodoStatus] || 'active'
}
