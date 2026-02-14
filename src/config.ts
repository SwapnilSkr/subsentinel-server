import admin from "firebase-admin";

// --- Firebase Configuration ---

/**
 * Initialize Firebase Admin SDK
 * This should be called once at application startup
 */
export function initializeFirebase(): void {
  if (admin.apps.length > 0) {
    console.log("ℹ️  Firebase already initialized");
    return;
  }

  try {
    // 1. Initialize from Environment Variables (Privileged)
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
      console.log("✅ Firebase initialized from Environment Variables");
      return;
    }

    // 2. Initialize with Project ID only (Limited Privilege)
    if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
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
    console.error("❌ Firebase Admin initialization failed. Check credentials.", error);
    throw error;
  }
}

// Export the admin instance for use in services
export { admin };
