import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'
import type { PlanTier } from '@/lib/supabase/types'

export const runtime = 'nodejs'

// ── Plan detection ────────────────────────────────────────────────────────────

function planFromPriceId(priceId: string): PlanTier {
  if (priceId === process.env.STRIPE_SOLO_PRICE_ID) return 'solo'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) return 'agency'
  return 'free'
}

// ── Profile updater ───────────────────────────────────────────────────────────

async function updateProfile(
  userId: string,
  patch: Record<string, unknown>
) {
  const admin = createAdminClient()
  const { error } = await (admin as any)
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    console.error('[stripe/webhook] Profile update error:', error.message)
    throw error
  }
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await (admin as any)
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  // userId is in subscription.metadata (set via subscription_data.metadata at checkout creation)
  // or in session.metadata as a fallback
  const userId =
    (subscription.metadata as Record<string, string>)?.supabaseUserId
    ?? (session.metadata as Record<string, string> | null)?.supabaseUserId
    ?? null

  if (!userId) {
    console.warn('[stripe/webhook] checkout.session.completed: no supabaseUserId in metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price?.id ?? ''
  const plan = planFromPriceId(priceId)

  await updateProfile(userId, {
    plan,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
  })
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId =
    (subscription.metadata as Record<string, string>)?.supabaseUserId
    ?? (await getUserIdFromCustomer(subscription.customer as string))

  if (!userId) {
    console.warn('[stripe/webhook] subscription update: cannot resolve userId for customer', subscription.customer)
    return
  }

  const priceId = subscription.items.data[0]?.price?.id ?? ''
  const plan: PlanTier =
    subscription.status === 'active' || subscription.status === 'trialing'
      ? planFromPriceId(priceId)
      : 'free'

  await updateProfile(userId, {
    plan,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId =
    (subscription.metadata as Record<string, string>)?.supabaseUserId
    ?? (await getUserIdFromCustomer(subscription.customer as string))

  if (!userId) return

  await updateProfile(userId, {
    plan: 'free',
    stripe_subscription_id: null,
    stripe_subscription_status: 'canceled',
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[stripe/webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed': {
        // .subscription was renamed in newer API versions — cast to any for safety
        const invoice = event.data.object as any
        const subId: string | null =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : (invoice.subscription?.id ?? invoice.parent?.subscription_details?.subscription ?? null)
        if (subId) {
          const sub = await getStripe().subscriptions.retrieve(subId)
          await handleSubscriptionUpdate(sub)
        }
        break
      }

      default:
        // Ignored event type
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
