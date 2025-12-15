import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { trackEvent } from '../lib/posthog'

function FeedbackForm({ onClose }) {
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState('query')
  const [message, setMessage] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Placeholder text based on category
  const categoryPlaceholders = {
    query: 'Ask your question or share your thoughts.',
    request: 'Describe the feature you would like to see.',
    collaboration: 'Tell us about your idea/proposal if you want to collaborate on the project.',
    bug: 'Describe the bug you encountered, preferably with steps to reproduce.',
  }

  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ rating, category, message }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          rating,
          category,
          message,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setIsSubmitted(true)
      trackEvent('feedback_submitted', {
        rating: data.rating,
        category: data.category,
        message_length: data.message.length,
      })
      
      // Reset form after showing success message
      setTimeout(() => {
        onClose()
      }, 2000)
    },
    onError: (error) => {
      console.error('Feedback submission error:', error)
      trackEvent('feedback_submission_failed', {
        error: error.message || 'Unknown error',
      })
      toast.error(error.message || 'Failed to submit feedback')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }

    if (!message.trim()) {
      toast.error('Please enter your feedback message')
      return
    }

    trackEvent('feedback_submit_attempted', {
      rating,
      category,
      message_length: message.length,
    })

    submitFeedbackMutation.mutate({ rating, category, message })
  }

  if (isSubmitted) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900">Thank You!</h3>
          <p className="text-gray-600">Your feedback has been submitted successfully.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Share Your Feedback</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How would you rate your experience? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  setRating(star)
                  trackEvent('feedback_rating_selected', { rating: star })
                }}
                className={`text-3xl transition-transform hover:scale-110 ${
                  star <= rating ? 'text-yellow-400' : 'text-gray-300'
                }`}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              trackEvent('feedback_category_selected', { category: e.target.value })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="query">General Query</option>
            <option value="request">Feature Request</option>
            <option value="collaboration">Collaboration</option>
            <option value="bug">Bug Report</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Feedback <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={categoryPlaceholders[category]}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitFeedbackMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default FeedbackForm

