import { Subscription } from "../models";

// --- Interfaces ---

export interface SubscriptionData {
  provider: string;
  amount: number;
  currency?: string;
  next_billing: string;
  status?: string;
  category?: string;
  userId?: string;
}

export interface SubscriptionSummary {
  totalBurn: number;
  activeCount: number;
  totalCount: number;
  renewingSoon: RenewalInfo[];
  currency: string;
}

export interface RenewalInfo {
  id: any;
  name: string;
  amount: number;
  daysLeft: number;
}

// --- Subscription Service ---

/**
 * Get all subscriptions sorted by next billing date
 */
export async function getAllSubscriptions(): Promise<any[]> {
  return await Subscription.find({}).sort({ next_billing: 1 });
}

/**
 * Get subscription summary for dashboard
 */
export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const activeSubscriptions = await Subscription.find({ status: "active" });

  const totalBurn = activeSubscriptions.reduce(
    (sum, sub) => sum + sub.amount,
    0,
  );

  // Get renewals within 7 days
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const renewingSoon = activeSubscriptions
    .filter((sub) => {
      const billingDate = new Date(sub.next_billing);
      return billingDate >= now && billingDate <= sevenDaysLater;
    })
    .map((sub) => ({
      id: sub._id,
      name: sub.provider,
      amount: sub.amount,
      daysLeft: Math.ceil(
        (new Date(sub.next_billing).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));

  return {
    totalBurn,
    activeCount: activeSubscriptions.length,
    totalCount: await Subscription.countDocuments(),
    renewingSoon,
    currency: "USD",
  };
}

/**
 * Create a new subscription
 */
export async function createSubscription(data: SubscriptionData): Promise<any> {
  const subscription = await Subscription.create({
    ...data,
    next_billing: new Date(data.next_billing),
  });
  return subscription;
}

/**
 * Update subscription status by ID
 */
export async function updateSubscriptionStatus(
  id: string, 
  status: string
): Promise<any | null> {
  const subscription = await Subscription.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  );
  return subscription;
}

/**
 * Delete subscription by ID
 */
export async function deleteSubscription(id: string): Promise<boolean> {
  const result = await Subscription.findByIdAndDelete(id);
  return result !== null;
}

/**
 * Check if subscription exists
 */
export async function subscriptionExists(id: string): Promise<boolean> {
  const count = await Subscription.countDocuments({ _id: id });
  return count > 0;
}
