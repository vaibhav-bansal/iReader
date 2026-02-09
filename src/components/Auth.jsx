import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { identifyUser, resetUser, trackEvent } from '../lib/posthog'
import FeedbackForm from './FeedbackForm'
import { useSubscription } from '../hooks/useSubscription'

const GITHUB_REPO_URL = 'https://github.com/vaibhav-bansal/readez'

function Auth({ children }) {
  const [loading, setLoading] = useState(true)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Only show buttons on Library page, not on Reader page
  const isLibraryPage = location.pathname === '/library'

  // Prevent body scroll when feedback modal is open
  useEffect(() => {
    if (showFeedbackModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showFeedbackModal])

  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
    staleTime: Infinity,
  })

  // Get user subscription status
  const { tier } = useSubscription(session?.user?.id)

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
      
      // Redirect to /library after successful OAuth login
      const redirectTo = `${window.location.origin}/library`
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
      navigate('/') // Redirect to landing page
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
        {/* GitHub Link - Top Right */}
        <div className="absolute top-4 right-4">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('github_link_clicked', { context: 'logged_out' })}
            className="text-gray-700 hover:text-gray-900 transition-colors"
            aria-label="View on GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold mb-4 text-center">ReadEz</h1>
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
      {/* Only show buttons on Library page, not on Reader page */}
      {isLibraryPage && (
        <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
          {/* Upgrade Button - Only show for free tier */}
          {tier === 'free' && (
            <Link
              to="/#pricing"
              onClick={() => trackEvent('upgrade_button_clicked', { location: 'header' })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Upgrade
            </Link>
          )}

          {/* Feedback Icon Button */}
          <button
            onClick={() => {
              setShowFeedbackModal(true)
              trackEvent('feedback_button_clicked', { context: 'header' })
            }}
            className="text-gray-600 hover:text-blue-600 transition-colors"
            title="Share Feedback"
            aria-label="Share Feedback"
          >
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
              <path d="M0 0h24v24H0V0z" fill="none"/>
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>
            </svg>
          </button>

          {/* GitHub Link */}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('github_link_clicked', { context: 'logged_in' })}
            className="text-gray-700 hover:text-gray-900 transition-colors"
            aria-label="View on GitHub"
            title="View on GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>

          {/* Sign Out Button */}
          <button
            onClick={signOut}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium cursor-pointer transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Feedback Modal - Only show on Library page */}
      {showFeedbackModal && isLibraryPage && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 transition-opacity duration-200"
            onClick={() => {
              setShowFeedbackModal(false)
              trackEvent('feedback_modal_closed', { method: 'backdrop_click' })
            }}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div
              className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 pointer-events-auto transform transition-all duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <FeedbackForm onClose={() => {
                setShowFeedbackModal(false)
                trackEvent('feedback_modal_closed', { method: 'close_button' })
              }} />
            </div>
          </div>
        </>
      )}

      {children}
    </>
  )
}

export default Auth
