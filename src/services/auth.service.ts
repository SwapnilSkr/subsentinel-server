import { User, type IUser } from "../models";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { admin, ENV, twilioClient } from "../config";

// --- Interfaces ---

export interface OTPResult {
	status: string;
	mock?: boolean;
}

export interface AuthResult {
	success: boolean;
	user?: IUser;
	token?: string;
	error?: string;
}

export interface AuthTokenPayload {
	userId: string;
}

// --- OTP Service ---

/**
 * Check if Twilio is running in mock mode
 */
function isTwilioMock(): boolean {
	return ENV.TWILIO_ACCOUNT_SID === "AC_MOCK_SID";
}

/**
 * Send OTP to phone number via Twilio
 */
export async function sendOTP(phone: string): Promise<OTPResult> {
	if (isTwilioMock()) {
		console.log(`[MOCK] Sending OTP to ${phone}`);
		return { status: "pending", mock: true };
	}

	try {
		const verification = await twilioClient.verify.v2
			.services(ENV.TWILIO_VERIFY_SERVICE_SID)
			.verifications.create({ to: phone, channel: "sms" });
		return { status: verification.status };
	} catch (error) {
		console.error("Twilio Send Error:", error);
		throw new Error("Failed to send OTP");
	}
}

/**
 * Verify OTP code for phone number
 */
export async function verifyOTP(
	phone: string,
	code: string,
): Promise<OTPResult> {
	if (isTwilioMock()) {
		console.log(`[MOCK] Verifying OTP ${code} for ${phone}`);
		if (code === "123456") return { status: "approved", mock: true };
		throw new Error("Invalid OTP (Mock)");
	}

	try {
		const verification = await twilioClient.verify.v2
			.services(ENV.TWILIO_VERIFY_SERVICE_SID)
			.verificationChecks.create({ to: phone, code });

		if (verification.status !== "approved") {
			throw new Error("Invalid OTP");
		}

		return { status: verification.status };
	} catch (error) {
		console.error("Twilio Verify Error:", error);
		throw new Error("Failed to verify OTP");
	}
}

// --- Firebase Auth Service ---

/**
 * Verify Firebase ID Token
 */
export async function verifyFirebaseToken(
	idToken: string,
): Promise<admin.auth.DecodedIdToken> {
	try {
		const decodedToken = await admin.auth().verifyIdToken(idToken);
		return decodedToken;
	} catch (error) {
		console.error("Firebase Verify Error:", error);
		throw new Error("Invalid Firebase Token");
	}
}

// --- User Service ---

/**
 * Find or create user by phone number
 */
export async function findOrCreateUserByPhone(phone: string): Promise<IUser> {
	let user = await User.findOne({ phone });
	if (!user) {
		user = await User.create({ phone });
	}
	return user;
}

/**
 * Find or create user by Google/Firebase data
 */
export async function findOrCreateUserByGoogle(
	decodedToken: admin.auth.DecodedIdToken,
): Promise<IUser> {
	let user = await User.findOne({ googleId: decodedToken.uid });
	if (!user) {
		if (decodedToken.email) {
			user = await User.findOneAndUpdate(
				{ email: decodedToken.email },
				{
					$set: {
						googleId: decodedToken.uid,
						email: decodedToken.email,
						displayName: decodedToken.name,
						photoUrl: decodedToken.picture,
					},
				},
				{ new: true },
			);
		}

		if (!user) {
			user = await User.create({
				googleId: decodedToken.uid,
				email: decodedToken.email,
				displayName: decodedToken.name,
				photoUrl: decodedToken.picture,
			});
		}
	}
	return user;
}

/**
 * Generate JWT token for user
 */
export function generateUserToken(userId: string): string {
	const options: SignOptions = {
		expiresIn: ENV.JWT_EXPIRES_IN as SignOptions["expiresIn"],
		issuer: "subsentinel-api",
		audience: "subsentinel-client",
	};

	return jwt.sign({ userId }, ENV.JWT_SECRET, options);
}

/**
 * Verify JWT token and return auth payload
 */
export function verifyUserToken(token: string): AuthTokenPayload {
	let decoded: string | JwtPayload;
	try {
		decoded = jwt.verify(token, ENV.JWT_SECRET, {
			issuer: "subsentinel-api",
			audience: "subsentinel-client",
		});
	} catch {
		throw new Error("Invalid or expired token");
	}

	if (typeof decoded === "string") {
		throw new Error("Invalid token payload");
	}

	const userId = decoded.userId;
	if (typeof userId !== "string" || userId.length === 0) {
		throw new Error("Token missing userId");
	}

	return { userId };
}

// --- Auth Flow Service ---

/**
 * Complete OTP verification and login flow
 */
export async function verifyOTPAndLogin(
	phone: string,
	code: string,
): Promise<AuthResult> {
	await verifyOTP(phone, code);
	const user = await findOrCreateUserByPhone(phone);
	const token = generateUserToken(user._id.toString());

	return {
		success: true,
		user,
		token,
	};
}

/**
 * Complete Google login flow
 */
export async function loginWithGoogle(
	firebaseToken: string,
): Promise<AuthResult> {
	const decodedToken = await verifyFirebaseToken(firebaseToken);
	const user = await findOrCreateUserByGoogle(decodedToken);
	const token = generateUserToken(user._id.toString());

	return {
		success: true,
		user,
		token,
	};
}
