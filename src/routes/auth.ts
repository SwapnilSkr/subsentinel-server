import { Elysia, t } from "elysia";
import { User } from "../models";
import twilio from "twilio";
import admin from "firebase-admin";

// --- Configuration ---
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || "AC_MOCK_SID";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || "MOCK_TOKEN";
const TWILIO_SERVICE =
  process.env.TWILIO_VERIFY_SERVICE_SID || "VA_MOCK_SERVICE";

const twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  try {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      // 1. Initialize from Env Vars (Privileged)
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Fix newlines in env vars
        }),
      });
      console.log("✅ Firebase initialized from Environment Variables");
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // 2. Initialize with Project ID only (Limited Privilege - Good for verifyIdToken)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        // Attempt to use ADC if available, otherwise just Project ID for token verification
        credential: admin.credential.applicationDefault(),
      });
      console.log("⚠️ Firebase initialized with Project ID/ADC");
    } else {
      // 3. Try to load service-account.json (Legacy / Local File)
      try {
        admin.initializeApp({
          credential: admin.credential.cert(require("../../service-account.json")),
        });
        console.log("✅ Firebase initialized from service-account.json");
      } catch (f) {
        // 4. Last resort: Default (ADC)
        admin.initializeApp();
        console.log("⚠️ Firebase initialized with default credentials");
      }
    }
  } catch (e) {
    console.warn(
      "❌ Firebase Admin initialization failed. Check credentials.",
      e,
    );
  }
}

// --- Helper Functions ---

// Send OTP via Twilio
const sendTwilioOTP = async (phone: string) => {
  if (TWILIO_SID === "AC_MOCK_SID") {
    console.log(`[MOCK] Sending OTP to ${phone}`);
    return { status: "pending", mock: true };
  }
  try {
    const verification = await twilioClient.verify.v2
      .services(TWILIO_SERVICE)
      .verifications.create({ to: phone, channel: "sms" });
    return verification;
  } catch (error) {
    console.error("Twilio Send Error:", error);
    throw new Error("Failed to send OTP");
  }
};

// Verify OTP via Twilio
const verifyTwilioOTP = async (phone: string, code: string) => {
  if (TWILIO_SID === "AC_MOCK_SID") {
    console.log(`[MOCK] Verifying OTP ${code} for ${phone}`);
    if (code === "123456") return { status: "approved", mock: true }; // Mock success
    throw new Error("Invalid OTP (Mock)");
  }
  try {
    const verification = await twilioClient.verify.v2
      .services(TWILIO_SERVICE)
      .verificationChecks.create({ to: phone, code });
    if (verification.status !== "approved") {
      throw new Error("Invalid OTP");
    }
    return verification;
  } catch (error) {
    console.error("Twilio Verify Error:", error);
    throw new Error("Failed to verify OTP");
  }
};

// Verify Firebase ID Token
const verifyFirebaseToken = async (idToken: string) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Firebase Verify Error:", error);
    // If testing without service-account, fallback to mock if env says so, otherwise throw
    if (!process.env.FIREBASE_CONFIG) {
      // Can fallback for dev
    }
    throw new Error("Invalid Firebase Token");
  }
};

// --- Auth Routes ---

export const authRoutes = (app: Elysia) =>
  app.group("/auth", (app) =>
    app
      // 1. Send OTP
      .post(
        "/otp/send",
        async ({ body, set }) => {
          try {
            await sendTwilioOTP(body.phone);
            return { success: true, message: "OTP sent" };
          } catch (e: any) {
            set.status = 400;
            return { success: false, error: e.message };
          }
        },
        {
          body: t.Object({ phone: t.String() }),
        },
      )

      // 2. Verify OTP & Login
      .post(
        "/otp/verify",
        async ({ body, set }) => {
          try {
            await verifyTwilioOTP(body.phone, body.code);

            // Find or Create User
            let user = await User.findOne({ phone: body.phone });
            if (!user) {
              user = await User.create({ phone: body.phone });
            }

            return {
              success: true,
              user: user,
              token: "mock_jwt_token_" + user._id, // Implement real JWT if needed
            };
          } catch (e: any) {
            set.status = 401;
            return { success: false, error: e.message };
          }
        },
        {
          body: t.Object({ phone: t.String(), code: t.String() }),
        },
      )

      // 3. Google/Firebase Login
      .post(
        "/google",
        async ({ body, set }) => {
          try {
            const decodedToken = await verifyFirebaseToken(body.token);

            // Find or Create User by Google UID (sub) or email
            let user = await User.findOne({ googleId: decodedToken.uid });
            if (!user) {
              user = await User.create({
                googleId: decodedToken.uid,
                email: decodedToken.email,
                displayName: decodedToken.name,
                photoUrl: decodedToken.picture,
              });
            }

            return {
              success: true,
              user: user,
              token: "mock_jwt_token_" + user._id,
            };
          } catch (e: any) {
            set.status = 401;
            return { success: false, error: e.message };
          }
        },
        {
          body: t.Object({ token: t.String() }), // Firebase ID Token
        },
      ),
  );
