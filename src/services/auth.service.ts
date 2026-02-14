import { User } from "../models";
import twilio from "twilio";
import { admin } from "../config";

// --- Configuration ---
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || "AC_MOCK_SID";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || "MOCK_TOKEN";
const TWILIO_SERVICE = process.env.TWILIO_VERIFY_SERVICE_SID || "VA_MOCK_SERVICE";

const twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);

// --- Interfaces ---

export interface OTPResult {
  status: string;
  mock?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}

// --- OTP Service ---

/**
 * Send OTP to phone number via Twilio
 */
export async function sendOTP(phone: string): Promise<OTPResult> {
  if (TWILIO_SID === "AC_MOCK_SID") {
    console.log(`[MOCK] Sending OTP to ${phone}`);
    return { status: "pending", mock: true };
  }
  
  try {
    const verification = await twilioClient.verify.v2
      .services(TWILIO_SERVICE)
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
export async function verifyOTP(phone: string, code: string): Promise<OTPResult> {
  if (TWILIO_SID === "AC_MOCK_SID") {
    console.log(`[MOCK] Verifying OTP ${code} for ${phone}`);
    if (code === "123456") return { status: "approved", mock: true };
    throw new Error("Invalid OTP (Mock)");
  }
  
  try {
    const verification = await twilioClient.verify.v2
      .services(TWILIO_SERVICE)
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
export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
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
export async function findOrCreateUserByPhone(phone: string): Promise<any> {
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone });
  }
  return user;
}

/**
 * Find or create user by Google/Firebase data
 */
export async function findOrCreateUserByGoogle(decodedToken: admin.auth.DecodedIdToken): Promise<any> {
  let user = await User.findOne({ googleId: decodedToken.uid });
  if (!user) {
    user = await User.create({
      googleId: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoUrl: decodedToken.picture,
    });
  }
  return user;
}

/**
 * Generate JWT token for user
 */
export function generateUserToken(userId: string): string {
  return "mock_jwt_token_" + userId;
}

// --- Auth Flow Service ---

/**
 * Complete OTP verification and login flow
 */
export async function verifyOTPAndLogin(phone: string, code: string): Promise<AuthResult> {
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
export async function loginWithGoogle(firebaseToken: string): Promise<AuthResult> {
  const decodedToken = await verifyFirebaseToken(firebaseToken);
  const user = await findOrCreateUserByGoogle(decodedToken);
  const token = generateUserToken(user._id.toString());
  
  return {
    success: true,
    user,
    token,
  };
}
