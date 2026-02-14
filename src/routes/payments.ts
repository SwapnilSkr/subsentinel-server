import { Elysia, t } from "elysia";
import { createCheckoutSession } from "../services";
import { logger } from "../middleware/logging";

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
            const result = await createCheckoutSession(body);
            
            logger.info(`[${requestId}] Checkout session created successfully: ${result.url}`);
            return result;
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
