import admin from "firebase-admin";
import twilio from "twilio";
import DodoPayments from "dodopayments";
import { randomBytes } from "crypto";

// ============================================
// Environment Configuration
// ============================================

const hasJwtSecretInEnv = Boolean(process.env.JWT_SECRET);
const generatedDevJwtSecret = randomBytes(64).toString("hex");

export const ENV = {
  // App
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),

  // Database
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://localhost:27017/sub_auditor",

  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "AC_MOCK_SID",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "MOCK_TOKEN",
  TWILIO_VERIFY_SERVICE_SID:
    process.env.TWILIO_VERIFY_SERVICE_SID || "VA_MOCK_SERVICE",

  // Dodo Payments
  DODO_PAYMENTS_API_KEY: process.env.DODO_PAYMENTS_API_KEY || "test_token",
  DODO_PAYMENTS_ENVIRONMENT: (process.env.DODO_PAYMENTS_ENVIRONMENT ||
    "test_mode") as "test_mode" | "live_mode",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || generatedDevJwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Firebase (optional - will use other methods if not provided)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,

  // Admin
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",

  // AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || "",

  // Logging
  LOG_LEVEL:
    (process.env.LOG_LEVEL as "debug" | "info" | "warn" | "error") || "debug",
};

// ============================================
// Service Clients (initialized in startup)
// ============================================

// Twilio Client
export let twilioClient: ReturnType<typeof twilio>;

// Dodo Payments Client
export let dodoClient: DodoPayments;

// ============================================
// Firebase Initialization
// ============================================

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase(): void {
  if (admin.apps.length > 0) {
    console.log("ℹ️  Firebase already initialized");
    return;
  }

  try {
    // 1. Initialize from Environment Variables (Privileged)
    if (
      ENV.FIREBASE_PROJECT_ID &&
      ENV.FIREBASE_CLIENT_EMAIL &&
      ENV.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: ENV.FIREBASE_PROJECT_ID,
          clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
          privateKey: ENV.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
      console.log("✅ Firebase initialized from Environment Variables");
      return;
    }

    // 2. Initialize with Project ID only (Limited Privilege)
    if (ENV.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: ENV.FIREBASE_PROJECT_ID,
        credential: admin.credential.applicationDefault(),
      });
      console.log("⚠️  Firebase initialized with Project ID/ADC");
      return;
    }

    // 3. Try to load service-account.json (Legacy / Local File)
    try {
      admin.initializeApp({
        credential: admin.credential.cert(require("../service-account.json")),
      });
      console.log("✅ Firebase initialized from service-account.json");
      return;
    } catch (fileError) {
      // 4. Last resort: Default (ADC)
      admin.initializeApp();
      console.log("⚠️  Firebase initialized with default credentials");
    }
  } catch (error) {
    console.error(
      "❌ Firebase Admin initialization failed. Check credentials.",
      error,
    );
    throw error;
  }
}

// ============================================
// Twilio Initialization
// ============================================

/**
 * Initialize Twilio Client
 */
export function initializeTwilio(): void {
  const isMock = ENV.TWILIO_ACCOUNT_SID === "AC_MOCK_SID";

  if (isMock) {
    console.log("⚠️  Twilio running in MOCK mode");
  } else {
    console.log("✅ Twilio initialized");
  }

  twilioClient = twilio(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);
}

// ============================================
// Dodo Payments Initialization
// ============================================

/**
 * Initialize Dodo Payments Client
 */
export function initializeDodoPayments(): void {
  const isTestMode = ENV.DODO_PAYMENTS_ENVIRONMENT === "test_mode";

  dodoClient = new DodoPayments({
    bearerToken: ENV.DODO_PAYMENTS_API_KEY,
    environment: ENV.DODO_PAYMENTS_ENVIRONMENT,
  });

  console.log(
    `${isTestMode ? "⚠️" : "✅"} Dodo Payments initialized (${ENV.DODO_PAYMENTS_ENVIRONMENT})`,
  );
}

// ============================================
// Master Initialization Function
// ============================================

/**
 * Initialize all external services
 * Call this at application startup
 */
export function initializeServices(): void {
  console.log("\n🚀 Initializing services...\n");

  if (ENV.NODE_ENV === "production" && !hasJwtSecretInEnv) {
    throw new Error("JWT_SECRET must be set in production");
  }

  if (!hasJwtSecretInEnv) {
    console.warn(
      "⚠️  JWT_SECRET not set. Generated an ephemeral development secret.",
    );
  }

  initializeFirebase();
  initializeTwilio();
  initializeDodoPayments();

  console.log("\n✅ All services initialized\n");
}

// Export Firebase admin for use in services
export { admin };
