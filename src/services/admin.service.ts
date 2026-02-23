import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { Types } from "mongoose";

import { ENV, admin as firebaseAdmin } from "../config";
import {
	Admin,
	Category,
	Subscription,
	User,
	UserPreferences,
	DeviceToken,
	type IAdmin,
	type ICategory,
	type ISubscription,
} from "../models";

// --- Interfaces ---

export interface AdminTokenPayload {
	adminId: string;
	role: "admin";
}

// --- Admin Auth ---

export async function loginAdmin(
	username: string,
	password: string,
): Promise<{ admin: IAdmin; token: string }> {
	const admin = await Admin.findOne({ username: username.toLowerCase() });
	if (!admin) {
		throw new Error("Invalid credentials");
	}

	const isMatch = await bcrypt.compare(password, admin.password);
	if (!isMatch) {
		throw new Error("Invalid credentials");
	}

	const token = generateAdminToken(admin._id.toString());
	return { admin, token };
}

export function generateAdminToken(adminId: string): string {
	const options: SignOptions = {
		expiresIn: "24h",
		issuer: "subsentinel-api",
		audience: "subsentinel-admin",
	};

	return jwt.sign({ adminId, role: "admin" }, ENV.JWT_SECRET, options);
}

export function verifyAdminToken(token: string): AdminTokenPayload {
	let decoded: string | JwtPayload;
	try {
		decoded = jwt.verify(token, ENV.JWT_SECRET, {
			issuer: "subsentinel-api",
			audience: "subsentinel-admin",
		});
	} catch {
		throw new Error("Invalid or expired admin token");
	}

	if (typeof decoded === "string") {
		throw new Error("Invalid token payload");
	}

	const { adminId, role } = decoded;
	if (typeof adminId !== "string" || role !== "admin") {
		throw new Error("Token missing admin claims");
	}

	return { adminId, role };
}

// --- Admin Category CRUD ---

export async function adminGetAllCategories(): Promise<ICategory[]> {
	return await Category.find().sort({ isDefault: -1, name: 1 });
}

export async function adminCreateCategory(data: {
	name: string;
	icon: string;
	color: string;
	logoUrl?: string;
}): Promise<ICategory> {
	return await Category.create({
		...data,
		isDefault: true,
		userId: null,
	});
}

export async function adminUpdateCategory(
	id: string,
	data: { name?: string; icon?: string; color?: string; logoUrl?: string },
): Promise<ICategory | null> {
	return await Category.findByIdAndUpdate(id, data, {
		new: true,
		runValidators: true,
	});
}

export async function adminDeleteCategory(id: string): Promise<boolean> {
	const result = await Category.findByIdAndDelete(id);
	return result !== null;
}

// --- Admin Subscription Template CRUD ---

export async function adminGetAllSubscriptions(): Promise<ISubscription[]> {
	return await Subscription.find({ isDefault: true }).populate("categoryId");
}

export async function adminCreateSubscription(data: {
	provider: string;
	amount: number;
	currency?: string;
	categoryId?: string;
	logoUrl?: string;
}): Promise<ISubscription> {
	const subscription = await Subscription.create({
		...data,
		isDefault: true,
	});
	return await subscription.populate("categoryId");
}

export async function adminUpdateSubscription(
	id: string,
	data: {
		provider?: string;
		amount?: number;
		currency?: string;
		categoryId?: string;
		logoUrl?: string;
	},
): Promise<ISubscription | null> {
	return await Subscription.findOneAndUpdate(
		{ _id: id, isDefault: true },
		data,
		{ new: true, runValidators: true },
	).populate("categoryId");
}

export async function adminDeleteSubscription(id: string): Promise<boolean> {
	const result = await Subscription.findOneAndDelete({
		_id: id,
		isDefault: true,
	});
	return result !== null;
}

// --- Admin User Deletion ---

export interface DeleteUserResult {
	user: boolean;
	preferences: boolean;
	devices: number;
	categories: number;
	subscriptions: number;
	firebaseGoogle: boolean;
}

export async function adminDeleteUser(
	userId: string,
): Promise<DeleteUserResult> {
	const result: DeleteUserResult = {
		user: false,
		preferences: false,
		devices: 0,
		categories: 0,
		subscriptions: 0,
		firebaseGoogle: false,
	};

	if (!Types.ObjectId.isValid(userId)) {
		throw new Error("Invalid userId");
	}

	const objectId = new Types.ObjectId(userId);

	// 1. Get user document first to find auth links
	const user = await User.findById(objectId);
	if (!user) {
		throw new Error("User not found");
	}

	// 2. Delete UserPreferences
	const prefsResult = await UserPreferences.deleteMany({ userId: objectId });
	result.preferences = prefsResult.deletedCount > 0;

	// 3. Delete DeviceTokens
	const deviceResult = await DeviceToken.deleteMany({ userId: objectId });
	result.devices = deviceResult.deletedCount;

	// 4. Delete user's custom categories (not default)
	const categoryResult = await Category.deleteMany({
		userId: objectId,
		isDefault: false,
	});
	result.categories = categoryResult.deletedCount;

	// 5. Delete subscriptions from user's array
	const subscriptionIds = user.subscriptions || [];
	if (subscriptionIds.length > 0) {
		const subResult = await Subscription.deleteMany({
			_id: { $in: subscriptionIds },
		});
		result.subscriptions = subResult.deletedCount;
	}

	// 6. Delete Firebase Auth entry (Google users only - use googleId)
	// Phone users use Twilio, not Firebase
	if (user.googleId) {
		try {
			await firebaseAdmin.auth().getUser(user.googleId);
			await firebaseAdmin.auth().deleteUser(user.googleId);
			result.firebaseGoogle = true;
		} catch (e) {
			console.log(e);
		}
	}

	// 7. Delete User document (last, after cleaning up references)
	const userResult = await User.findByIdAndDelete(objectId);
	result.user = userResult !== null;

	return result;
}
