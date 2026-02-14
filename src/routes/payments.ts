import { Elysia, t } from "elysia";
import DodoPayments from "dodopayments";
import { logger } from "../middleware/logging";

// Initialize Dodo Payments
const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || "test_token",
  environment: "test_mode",
});

export const paymentRoutes = (app: Elysia) =>
  app.group("/checkout", (app) =>
    app
      // POST create checkout session
      .post(
        "/",
        async ({ request, body }) => {
          const requestId = request.__log?.id || "unknown";
          logger.info(`[${requestId}] Creating checkout session for product: ${body.productId}, customer: ${body.email}`);
          
          try {
            const session = await dodo.checkoutSessions.create({
              product_cart: [{ product_id: body.productId, quantity: 1 }],
              customer: { email: body.email, name: body.name },
              return_url: "subsentinel://payment-success",
            });
            
            logger.info(`[${requestId}] Checkout session created successfully: ${session.checkout_url}`);
            return { url: session.checkout_url };
          } catch (error) {
            logger.error(`[${requestId}] Failed to create checkout session:`, error);
            throw error;
          }
        },
        {
          body: t.Object({
            productId: t.String(),
            email: t.String(),
            name: t.String(),
          }),
        },
      )
  );
