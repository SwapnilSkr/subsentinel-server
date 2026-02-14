import { dodoClient } from "../config";

// --- Interfaces ---

export interface CheckoutData {
  productId: string;
  email: string;
  name: string;
}

export interface CheckoutResult {
  url: string;
}

// --- Payment Service ---

/**
 * Create a checkout session for a product
 */
export async function createCheckoutSession(data: CheckoutData): Promise<CheckoutResult> {
  const session = await dodoClient.checkoutSessions.create({
    product_cart: [{ product_id: data.productId, quantity: 1 }],
    customer: { email: data.email, name: data.name },
    return_url: "subsentinel://payment-success",
  });

  if (!session.checkout_url) {
    throw new Error("Failed to create checkout session: No checkout URL returned");
  }

  return { url: session.checkout_url };
}
