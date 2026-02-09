// Supabase Edge Function: create-checkout
// Handles creation of Dodo Payments checkout sessions
// This is a proxy to call Dodo Payments API securely from the backend

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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { tier } = await req.json()

    if (!tier || !['pro', 'plus'].includes(tier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier. Must be "pro" or "plus"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Dodo Payments configuration
    const env = Deno.env.get('VITE_ENV') || 'TEST'
    const isTestMode = env === 'TEST'

    const config = isTestMode
      ? {
          apiBaseUrl: 'https://test.dodopayments.com',
          apiKey: Deno.env.get('DODO_TEST_API_KEY'),
          proProductId: Deno.env.get('DODO_TEST_PRO_PRODUCT_ID'),
          plusProductId: Deno.env.get('DODO_TEST_PLUS_PRODUCT_ID'),
        }
      : {
          apiBaseUrl: 'https://live.dodopayments.com',
          apiKey: Deno.env.get('DODO_API_KEY'),
          proProductId: Deno.env.get('DODO_PRO_PRODUCT_ID'),
          plusProductId: Deno.env.get('DODO_PLUS_PRODUCT_ID'),
        }

    const productId = tier === 'pro' ? config.proProductId : config.plusProductId

    if (!productId || !config.apiKey) {
      console.error('Missing Dodo configuration:', { productId: !!productId, apiKey: !!config.apiKey })
      return new Response(
        JSON.stringify({ error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare checkout session data
    const checkoutData = {
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
        },
      ],
      customer: {
        email: user.email,
      },
      return_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      billing_currency: 'USD',
      metadata: {
        user_id: user.id,
        tier: tier,
      },
    }

    console.log('Creating checkout session:', { tier, userId: user.id, env })

    // Call Dodo Payments API
    const response = await fetch(`${config.apiBaseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Dodo API error:', errorText)
      let errorMessage = 'Failed to create checkout session'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    console.log('Checkout session created:', data.checkout_url)

    return new Response(
      JSON.stringify({ checkout_url: data.checkout_url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating checkout:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
