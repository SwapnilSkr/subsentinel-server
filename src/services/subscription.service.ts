import { Types } from "mongoose";
import { Subscription, User } from "../models";

// --- Interfaces ---

export interface SubscriptionData {
  provider: string;
  amount: number;
  currency?: string;
  next_billing: string;
  status?: "active" | "paused" | "cancelled";
  category?: string;
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

async function resolveUserId(userId: string): Promise<Types.ObjectId> {
  if (!Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  const objectId = new Types.ObjectId(userId);
  const userExists = await User.exists({ _id: objectId });
  if (!userExists) {
    throw new Error("User not found");
  }
  return objectId;
}

// --- Subscription Service ---

/**
 * Get all subscriptions sorted by next billing date
 */
export async function getAllSubscriptions(userId: string): Promise<any[]> {
  const ownerId = await resolveUserId(userId);
  return await Subscription.find({ userId: ownerId }).sort({ next_billing: 1 });
}

/**
 * Get subscription summary for dashboard
 */
export async function getSubscriptionSummary(
  userId: string,
): Promise<SubscriptionSummary> {
  const ownerId = await resolveUserId(userId);
  const activeSubscriptions = await Subscription.find({
    status: "active",
    userId: ownerId,
  });

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
    totalCount: await Subscription.countDocuments({ userId: ownerId }),
    renewingSoon,
    currency: "USD",
  };
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  data: SubscriptionData,
  userId: string,
): Promise<any> {
  const createData: {
    provider: string;
    amount: number;
    currency?: string;
    next_billing: Date;
    status?: "active" | "paused" | "cancelled";
    category?: string;
    userId: Types.ObjectId;
  } = {
    provider: data.provider,
    amount: data.amount,
    currency: data.currency,
    next_billing: new Date(data.next_billing),
    status: data.status,
    category: data.category,
    userId: await resolveUserId(userId),
  };

  const subscription = await Subscription.create(createData);
  return subscription;
}

/**
 * Update subscription status by ID
 */
export async function updateSubscriptionStatus(
  id: string, 
  status: "active" | "paused" | "cancelled",
  userId: string,
): Promise<any | null> {
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
    return null;
  }

  const subscription = await Subscription.findOneAndUpdate(
    { _id: id, userId: new Types.ObjectId(userId) },
    { status },
    { new: true, runValidators: true },
  );
  return subscription;
}

/**
 * Delete subscription by ID
 */
export async function deleteSubscription(
  id: string,
  userId: string,
): Promise<boolean> {
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
    return false;
  }

  const result = await Subscription.findOneAndDelete({
    _id: id,
    userId: new Types.ObjectId(userId),
  });
  return result !== null;
}

/**
 * Check if subscription exists
 */
export async function subscriptionExists(id: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(id)) {
    return false;
  }

  const count = await Subscription.countDocuments({ _id: id });
  return count > 0;
}
