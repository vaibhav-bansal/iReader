-- Migration: Create subscription-related tables
-- Created: 2026-02-09
-- Description: Tables for subscriptions, payments, and usage tracking

-- Table: subscriptions
-- Tracks user subscription status and lifecycle
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'plus')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),
  dodo_subscription_id TEXT UNIQUE,
  dodo_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one active subscription per user
  UNIQUE(user_id, status)
);

-- Table: payments
-- Tracks all payment transactions for audit and history
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  dodo_payment_id TEXT UNIQUE NOT NULL,
  dodo_subscription_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: subscription_usage
-- Tracks feature usage for enforcement (AI summaries, storage, etc.)
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per user per feature
  UNIQUE(user_id, feature)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_dodo_id ON public.subscriptions(dodo_subscription_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_dodo_payment_id ON public.payments(dodo_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON public.subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_feature ON public.subscription_usage(feature);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can write subscription data (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Payments policies
-- Users can read their own payment history
CREATE POLICY "Users can read own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can write payment data (for webhooks)
CREATE POLICY "Service role can manage payments"
  ON public.payments
  FOR ALL
  USING (auth.role() = 'service_role');

-- Subscription usage policies
-- Users can read their own usage data
CREATE POLICY "Users can read own usage"
  ON public.subscription_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own usage (for incrementing counters)
CREATE POLICY "Users can update own usage"
  ON public.subscription_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can manage all usage data
CREATE POLICY "Service role can manage usage"
  ON public.subscription_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: Auto-update updated_at on row changes
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subscription_usage_updated_at
  BEFORE UPDATE ON public.subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function: Initialize free subscription for new users
CREATE OR REPLACE FUNCTION public.initialize_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id, status) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create free subscription when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_free_subscription();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.subscription_usage TO service_role;
GRANT SELECT, UPDATE ON public.subscription_usage TO authenticated;
