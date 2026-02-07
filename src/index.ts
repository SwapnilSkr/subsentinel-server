import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import DodoPayments from "dodopayments";
import { connectDB } from "./db";
import { Subscription, DeviceToken } from "./models";

// Initialize Dodo Payments
const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || "test_token",
  environment: "test_mode",
});

// Connect to MongoDB
await connectDB();

const app = new Elysia()
  .use(cors())

  // ==================== SUBSCRIPTIONS ====================
  .group("/subscriptions", (app) =>
    app
      // GET all subscriptions
      .get("/", async () => {
        const subscriptions = await Subscription.find({}).sort({
          next_billing: 1,
        });
        return subscriptions;
      })

      // GET subscription summary (for dashboard)
      .get("/summary", async () => {
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
        async ({ body }) => {
          const subscription = await Subscription.create({
            ...body,
            next_billing: new Date(body.next_billing),
          });
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
        async ({ params, body }) => {
          const subscription = await Subscription.findByIdAndUpdate(
            params.id,
            { status: body.status },
            { new: true },
          );
          return subscription;
        },
        {
          body: t.Object({ status: t.String() }),
        },
      )

      // DELETE subscription
      .delete("/:id", async ({ params }) => {
        await Subscription.findByIdAndDelete(params.id);
        return { success: true };
      }),
  )

  // ==================== CHECKOUT (Dodo Payments) ====================
  .post(
    "/checkout",
    async ({ body }) => {
      const session = await dodo.checkoutSessions.create({
        product_cart: [{ product_id: body.productId, quantity: 1 }],
        customer: { email: body.email, name: body.name },
        return_url: "subsentinel://payment-success",
      });
      return { url: session.checkout_url };
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
    async ({ body }) => {
      const device = await DeviceToken.findOneAndUpdate(
        { token: body.token },
        { userId: body.userId, platform: body.platform },
        { upsert: true, new: true },
      );
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
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))

  .listen(3000);

console.log(
  `🚀 SubSentinel Backend running at ${app.server?.hostname}:${app.server?.port}`,
);
