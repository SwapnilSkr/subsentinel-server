import { Subscription, User, type ISubscription } from "../models";
import { Types } from "mongoose";
import { ENV } from "../config";

// --- Interfaces ---

export interface SubscriptionData {
	provider: string;
	amount: number;
	currency?: string;
	next_billing: string;
	status?: "active" | "paused" | "cancelled";
	categoryId?: string;
	logoUrl?: string;
}

export interface SubscriptionSummary {
	totalBurn: number;
	activeCount: number;
	totalCount: number;
	renewingSoon: RenewalInfo[];
	currency: string;
}

export interface RenewalInfo {
	id: Types.ObjectId;
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
export async function getAllSubscriptions(
	userId: string,
): Promise<ISubscription[]> {
	const ownerId = await resolveUserId(userId);
	const user = await User.findById(ownerId).populate({
		path: "subscriptions",
		populate: { path: "categoryId" },
		options: { sort: { next_billing: 1 } },
	});
	return (user?.subscriptions as unknown as ISubscription[]) || [];
}

/**
 * Get subscription summary for dashboard
 */
export async function getSubscriptionSummary(
	userId: string,
): Promise<SubscriptionSummary> {
	const ownerId = await resolveUserId(userId);
	const user = await User.findById(ownerId).populate("subscriptions");
	const subscriptions = (user?.subscriptions ||
		[]) as unknown as ISubscription[];

	const activeSubscriptions = subscriptions.filter(
		(sub) => sub.status === "active",
	);

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
			if (!sub.next_billing) return false;
			const billingDate = new Date(sub.next_billing);
			return billingDate >= now && billingDate <= sevenDaysLater;
		})
		.map((sub) => {
			const nextBilling = sub.next_billing
				? new Date(sub.next_billing).getTime()
				: 0;
			return {
				id: sub._id as Types.ObjectId,
				name: sub.provider,
				amount: sub.amount,
				daysLeft: nextBilling
					? Math.ceil((nextBilling - now.getTime()) / (1000 * 60 * 60 * 24))
					: 0,
			};
		});

	return {
		totalBurn,
		activeCount: activeSubscriptions.length,
		totalCount: subscriptions.length,
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
): Promise<ISubscription> {
	const ownerId = await resolveUserId(userId);

	const logoUrl = data.logoUrl || ENV.DEFAULT_SUBSCRIPTION_LOGO_URL || undefined;

	const createData: Partial<ISubscription> = {
		provider: data.provider,
		amount: data.amount,
		currency: data.currency,
		next_billing: new Date(data.next_billing),
		status: data.status,
		isDefault: false,
		logoUrl,
	};

	if (data.categoryId && Types.ObjectId.isValid(data.categoryId)) {
		createData.categoryId = new Types.ObjectId(data.categoryId);
	}

	const subscription = await Subscription.create(createData);

	await User.findByIdAndUpdate(ownerId, {
		$push: { subscriptions: subscription._id },
	});

	return await subscription.populate("categoryId");
}

/**
 * Update subscription status by ID
 */
export async function updateSubscriptionStatus(
	id: string,
	status: "active" | "paused" | "cancelled",
	userId: string,
): Promise<ISubscription | null> {
	if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
		return null;
	}

	const user = await User.findById(userId);
	if (!user || !user.subscriptions.some((subId) => subId.toString() === id)) {
		return null;
	}

	const subscription = await Subscription.findByIdAndUpdate(
		id,
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

	const user = await User.findById(userId);
	if (!user || !user.subscriptions.some((subId) => subId.toString() === id)) {
		return false;
	}

	const result = await Subscription.findByIdAndDelete(id);
	if (!result) return false;

	await User.findByIdAndUpdate(userId, {
		$pull: { subscriptions: new Types.ObjectId(id) },
	});

	return true;
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
