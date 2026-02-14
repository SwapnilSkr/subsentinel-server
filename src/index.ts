import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import DodoPayments from "dodopayments";
import { connectDB } from "./db";
import { Subscription, DeviceToken } from "./models";
import { authRoutes } from "./auth";
import { loggingMiddleware, logger, colors, CURRENT_LOG_LEVEL } from "./middleware/logging";

// Initialize Dodo Payments
const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || "test_token",
  environment: "test_mode",
});

// Connect to MongoDB
await connectDB();

const app = new Elysia()
  .use(cors())
  .use(loggingMiddleware)
  .decorate("logger", logger)

  // ==================== AUTH ====================
  .use(authRoutes)

  // ==================== SUBSCRIPTIONS ====================
  .group("/subscriptions", (app) =>
    app
      // GET all subscriptions
      .get("/", async ({ request }) => {
        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "FIND", "subscriptions", { filter: {}, sort: { next_billing: 1 } });
        
        const subscriptions = await Subscription.find({}).sort({
          next_billing: 1,
        });
        
        logger.logDBOperation(requestId, "FIND_COMPLETE", "subscriptions", { count: subscriptions.length });
        return subscriptions;
      })

      // GET subscription summary (for dashboard)
      .get("/summary", async ({ request }) => {
        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "FIND", "subscriptions", { filter: { status: "active" } });
        
        const activeSubscriptions = await Subscription.find({
          status: "active",
        });

        const totalBurn = activeSubscriptions.reduce(
          (sum, sub) => sum + sub.amount,
          0,
        );

        // Get renewals within 7 days
        const now = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        logger.logDBOperation(requestId, "AGGREGATE", "subscriptions", { 
          operation: "renewals_within_7_days",
          count: activeSubscriptions.length 
        });

        const renewingSoon = activeSubscriptions
          .filter((sub) => {
            const billingDate = new Date(sub.next_billing);
            return billingDate >= now && billingDate <= sevenDaysLater;
          })
          .map((sub) => ({
            id: sub._id,
            name: sub.provider,
            amount: sub.amount,
            daysLeft: Math.ceil(
              (new Date(sub.next_billing).getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          }));

        return {
          totalBurn,
          activeCount: activeSubscriptions.length,
          totalCount: await Subscription.countDocuments(),
          renewingSoon,
          currency: "USD",
        };
      })

      // POST create new subscription
      .post(
        "/",
        async ({ request, body }) => {
          const requestId = request.__log?.id || "unknown";
          logger.logDBOperation(requestId, "CREATE", "subscriptions", { provider: body.provider, amount: body.amount });
          
          const subscription = await Subscription.create({
            ...body,
            next_billing: new Date(body.next_billing),
          });
          
          logger.logDBOperation(requestId, "CREATE_COMPLETE", "subscriptions", { id: subscription._id });
          return subscription;
        },
        {
          body: t.Object({
            provider: t.String(),
            amount: t.Number(),
            currency: t.Optional(t.String()),
            next_billing: t.String(),
            status: t.Optional(t.String()),
            category: t.Optional(t.String()),
            userId: t.Optional(t.String()),
          }),
        },
      )

      // PATCH update subscription status (pause/resume/cancel)
      .patch(
        "/:id/status",
        async ({ request, params, body }) => {
          const requestId = request.__log?.id || "unknown";
          logger.logDBOperation(requestId, "UPDATE", "subscriptions", { id: params.id, status: body.status });
          
          const subscription = await Subscription.findByIdAndUpdate(
            params.id,
            { status: body.status },
            { new: true },
          );
          
          if (!subscription) {
            logger.warn(`[${requestId}] Subscription not found: ${params.id}`);
          } else {
            logger.logDBOperation(requestId, "UPDATE_COMPLETE", "subscriptions", { id: subscription._id, newStatus: body.status });
          }
          
          return subscription;
        },
        {
          body: t.Object({ status: t.String() }),
        },
      )

      // DELETE subscription
      .delete("/:id", async ({ request, params }) => {
        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "DELETE", "subscriptions", { id: params.id });
        
        const result = await Subscription.findByIdAndDelete(params.id);
        
        if (!result) {
          logger.warn(`[${requestId}] Subscription not found for deletion: ${params.id}`);
        } else {
          logger.logDBOperation(requestId, "DELETE_COMPLETE", "subscriptions", { id: params.id });
        }
        
        return { success: true };
      }),
  )

  // ==================== CHECKOUT (Dodo Payments) ====================
  .post(
    "/checkout",
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

  // ==================== DEVICE REGISTRATION (FCM) ====================
  .post(
    "/register-device",
    async ({ request, body }) => {
      const requestId = request.__log?.id || "unknown";
      logger.logDBOperation(requestId, "UPSERT", "device_tokens", { 
        token: body.token.substring(0, 10) + "...", 
        platform: body.platform 
      });
      
      const device = await DeviceToken.findOneAndUpdate(
        { token: body.token },
        { userId: body.userId, platform: body.platform },
        { upsert: true, new: true },
      );
      
      logger.logDBOperation(requestId, "UPSERT_COMPLETE", "device_tokens", { id: device._id });
      return device;
    },
    {
      body: t.Object({
        token: t.String(),
        userId: t.Optional(t.String()),
        platform: t.String(),
      }),
    },
  )

  // ==================== HEALTH CHECK ====================
  .get("/health", ({ request }) => {
    const requestId = request.__log?.id || "unknown";
    logger.debug(`[${requestId}] Health check requested`);
    return { status: "ok", timestamp: new Date().toISOString(), requestId };
  })

  .get("/", () => ({
    status: "SubSentinel Backend",
    message: "Welcome to SubSentinel Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }))

  .listen(3000);

console.log(
  `${colors.green}🚀 SubSentinel Backend running at ${app.server?.hostname}:${app.server?.port}${colors.reset}`,
);
console.log(
  `${colors.cyan}📊 Logging level: ${CURRENT_LOG_LEVEL.toUpperCase()}${colors.reset}`
);
console.log(
  `${colors.gray}   Request logs include: timestamp, duration, status, body, headers, and more${colors.reset}`
);
