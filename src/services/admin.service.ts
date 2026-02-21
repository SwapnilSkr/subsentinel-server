import bcrypt from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

import { ENV } from "../config";
import {
	Admin,
	Category,
	Subscription,
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
