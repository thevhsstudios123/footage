import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Stripe webhook handler.
 *
 * Listens for subscription lifecycle events and updates the user's plan in
 * Clerk public metadata (or swap for your DB). The userId is stored in the
 * customer's metadata when the checkout session is created.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not set" }, { status: 500 });
  }

  const sig = headers().get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    log.error({
      event: "stripe.webhook_verify_fail",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const subId = session.subscription as string | null;
        if (userId && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const priceId = sub.items.data[0]?.price.id;
          const plan = planFromPriceId(priceId);
          // TODO: persist `plan` for `userId` in your DB or Clerk metadata.
          log.info({ event: "stripe.checkout_completed", userId, plan });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const priceId = sub.items.data[0]?.price.id;
        const plan =
          event.type === "customer.subscription.deleted"
            ? "free"
            : planFromPriceId(priceId);
        if (userId) {
          // TODO: persist `plan` for `userId`
          log.info({ event: "stripe.subscription_updated", userId, plan });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    log.error({
      event: "stripe.webhook_handler_fail",
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
