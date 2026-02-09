// SubscriptionBadge Component
// Displays user's current subscription tier as a badge

import { formatTierName, getTierColor } from '../lib/subscriptionHelpers'

export default function SubscriptionBadge({ tier, className = '' }) {
  const tierName = formatTierName(tier)
  const color = getTierColor(tier)

  const colorClasses = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  }

  const bgClass = colorClasses[color] || colorClasses.gray

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${bgClass} ${className}`}
    >
      {tierName}
    </span>
  )
}
