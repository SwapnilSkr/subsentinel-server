import { Elysia, t } from "elysia";
import { Subscription } from "../models";
import { logger } from "../middleware/logging";

export const subscriptionRoutes = (app: Elysia) =>
  app.group("/subscriptions", (app) =>
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
  );
