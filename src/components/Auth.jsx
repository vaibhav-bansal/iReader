import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { identifyUser, resetUser, trackEvent } from '../lib/posthog'

function Auth({ children }) {
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
    staleTime: Infinity,
  })

  useEffect(() => {
    if (!loading) {
      refetchSession()
    }
  }, [loading, refetchSession])

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoading(false)
      // Identify user if session exists
      if (session?.user) {
        identifyUser(
          session.user.id,
          session.user.email || session.user.user_metadata?.email || 'unknown',
          {
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            provider: session.user.app_metadata?.provider,
            created_at: session.user.created_at,
          }
        )
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(false)
      
      // Handle authentication events
      if (event === 'SIGNED_IN' && session?.user) {
        const email = session.user.email || session.user.user_metadata?.email || 'unknown'
        identifyUser(
          session.user.id,
          email,
          {
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
            provider: session.user.app_metadata?.provider,
            created_at: session.user.created_at,
          }
        )
        trackEvent('user_signed_in', {
          method: 'google_oauth',
        })
      } else if (event === 'SIGNED_OUT') {
        resetUser()
        trackEvent('user_signed_out')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      // Track sign in attempt
      trackEvent('sign_in_attempted', {
        method: 'google_oauth',
      })
      
      // Use current origin (automatically works for localhost and production)
      const redirectTo = window.location.origin
      console.log('OAuth redirect URL:', redirectTo)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
        },
      })
      if (error) throw error
      // For implicit flow, the browser automatically redirects to Google,
      // then back to the app with the session
    } catch (error) {
      console.error('Error signing in:', error)
      trackEvent('sign_in_failed', {
        method: 'google_oauth',
        error: error.message || 'Unknown error',
      })
      toast.error(error.message || 'Failed to sign in')
    }
  }

  const signOut = async () => {
    try {
      trackEvent('sign_out_attempted')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      resetUser()
      trackEvent('user_signed_out')
      toast.success('Signed out successfully')
      queryClient.clear() // Clear all cached queries
      refetchSession()
    } catch (error) {
      console.error('Error signing out:', error)
      trackEvent('sign_out_failed', {
        error: error.message || 'Unknown error',
      })
      toast.error(error.message || 'Failed to sign out')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-4 text-center">iReader</h1>
          <p className="text-gray-600 mb-6 text-center">
            Sign in with Google to access your PDF library and sync reading progress across devices.
          </p>
          <button
            onClick={signInWithGoogle}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="absolute top-4 right-4">
        <button
          onClick={signOut}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium cursor-pointer"
        >
          Sign Out
        </button>
      </div>
      {children}
    </>
  )
}

export default Auth
