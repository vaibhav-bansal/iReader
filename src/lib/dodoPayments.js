// Dodo Payments Integration
// Handles checkout session creation and payment flows
// Calls Supabase Edge Function which securely communicates with Dodo Payments

import { supabase } from './supabase'

/**
 * Create Dodo Payments checkout session via Supabase Edge Function
 * @param {Object} params - Checkout parameters
 * @param {string} params.tier - Subscription tier (pro or plus)
 * @returns {Promise<string>} Checkout URL to redirect user to
 */
export async function createCheckoutSession({ tier }) {
  try {
    // Get the current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('You must be logged in to subscribe')
    }

    // Log current mode (helpful for debugging)
    const env = import.meta.env.VITE_ENV || 'TEST'
    console.log(`💳 Dodo Payments Mode: ${env}`)

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('checkout-session-manager', {
      body: { tier },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      console.error('Edge function error:', error)
      throw new Error(error.message || 'Failed to create checkout session')
    }

    if (!data.checkout_url) {
      throw new Error('No checkout URL returned')
    }

    return data.checkout_url
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

/**
 * Get customer portal URL for managing subscription
 * @param {string} customerId - Dodo customer ID
 * @returns {Promise<string>} Customer portal URL
 */
export async function getCustomerPortalUrl(customerId) {
  try {
    const config = getDodoConfig()

    const response = await fetch(`${config.apiBaseUrl}/customers/${customerId}/customer-portal/session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.publicKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Failed to get customer portal URL'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data.link
  } catch (error) {
    console.error('Error getting customer portal:', error)
    throw error
  }
}
