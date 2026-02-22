import { UserPreferences } from "../models/user-preferences.model";
import { Types } from "mongoose";

export interface UserPreferencesData {
	budget: number;
	spendingAwareness?: "know" | "unsure" | "no_idea";
	categories?: string[];
	painPoints?: string[];
	goals?: string[];
	alertTiming?: "24h" | "3d" | "1w";
}

export interface UserPreferencesResponse {
	_id: Types.ObjectId;
	userId: Types.ObjectId;
	budget: number;
	spendingAwareness: "know" | "unsure" | "no_idea";
	categories: Types.ObjectId[];
	painPoints: string[];
	goals: string[];
	alertTiming: "24h" | "3d" | "1w";
	onboardingComplete: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Get user preferences by userId
 */
export async function getUserPreferences(
	userId: string,
): Promise<UserPreferencesResponse | null> {
	if (!Types.ObjectId.isValid(userId)) return null;

	return await UserPreferences.findOne({
		userId: new Types.ObjectId(userId),
	});
}

/**
 * Create or update user preferences
 */
export async function saveUserPreferences(
	data: UserPreferencesData,
	userId: string,
): Promise<UserPreferencesResponse> {
	if (!Types.ObjectId.isValid(userId)) {
		throw new Error("Invalid userId");
	}

	const updateData: Record<string, unknown> = {
		budget: data.budget,
		spendingAwareness: data.spendingAwareness || "unsure",
		painPoints: data.painPoints || [],
		goals: data.goals || [],
		alertTiming: data.alertTiming || "24h",
	};

	if (data.categories) {
		updateData.categories = data.categories.map(
			(catId) => new Types.ObjectId(catId),
		);
	}

	const preferences = await UserPreferences.findOneAndUpdate(
		{ userId: new Types.ObjectId(userId) },
		{ $set: updateData },
		{
			new: true,
			upsert: true,
			runValidators: true,
		},
	);

	return preferences as unknown as UserPreferencesResponse;
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding(userId: string): Promise<boolean> {
	if (!Types.ObjectId.isValid(userId)) return false;

	const result = await UserPreferences.findOneAndUpdate(
		{ userId: new Types.ObjectId(userId) },
		{ $set: { onboardingComplete: true } },
		{ new: true },
	);

	return result !== null;
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(
	userId: string,
): Promise<boolean> {
	if (!Types.ObjectId.isValid(userId)) return false;

	const preferences = await UserPreferences.findOne({
		userId: new Types.ObjectId(userId),
	});

	return preferences?.onboardingComplete ?? false;
}

/**
 * Check if user has any preferences set
 */
export async function hasUserPreferences(userId: string): Promise<boolean> {
	if (!Types.ObjectId.isValid(userId)) return false;

	const preferences = await UserPreferences.findOne({
		userId: new Types.ObjectId(userId),
	});

	return preferences !== null;
}
