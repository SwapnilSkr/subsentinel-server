import { Elysia, t } from "elysia";
import { 
  getAllSubscriptions, 
  getSubscriptionSummary, 
  createSubscription, 
  updateSubscriptionStatus, 
  deleteSubscription 
} from "../services";
import { logger } from "../middleware/logging";
import { requireAuth } from "../middleware/auth";

export const subscriptionRoutes = (app: Elysia) =>
  app.group("/subscriptions", (app) =>
    app.guard({ beforeHandle: requireAuth }, (app) =>
      app
      // GET all subscriptions
      .get("/", async ({ request }) => {
        const userId = request.__auth?.userId;
        if (!userId) {
          throw new Error("Unauthorized");
        }

        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "FIND", "subscriptions", {
          filter: { userId },
          sort: { next_billing: 1 },
        });
        
        const subscriptions = await getAllSubscriptions(userId);
        
        logger.logDBOperation(requestId, "FIND_COMPLETE", "subscriptions", { count: subscriptions.length });
        return subscriptions;
      })

      // GET subscription summary (for dashboard)
      .get("/summary", async ({ request }) => {
        const userId = request.__auth?.userId;
        if (!userId) {
          throw new Error("Unauthorized");
        }

        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "FIND", "subscriptions", {
          filter: { status: "active", userId },
        });
        
        const summary = await getSubscriptionSummary(userId);

        logger.logDBOperation(requestId, "AGGREGATE", "subscriptions", { 
          operation: "dashboard_summary",
          activeCount: summary.activeCount
        });

        return summary;
      })

      // POST create new subscription
      .post(
        "/",
        async ({ request, body }) => {
          const userId = request.__auth?.userId;
          if (!userId) {
            throw new Error("Unauthorized");
          }

          const requestId = request.__log?.id || "unknown";
          logger.logDBOperation(requestId, "CREATE", "subscriptions", { provider: body.provider, amount: body.amount });
          
          const subscription = await createSubscription(body, userId);
          
          logger.logDBOperation(requestId, "CREATE_COMPLETE", "subscriptions", { id: subscription._id });
          return subscription;
        },
        {
          body: t.Object({
            provider: t.String(),
            amount: t.Number(),
            currency: t.Optional(t.String()),
            next_billing: t.String(),
            status: t.Optional(
              t.Union([
                t.Literal("active"),
                t.Literal("paused"),
                t.Literal("cancelled"),
              ]),
            ),
            category: t.Optional(t.String()),
          }),
        },
      )

      // PATCH update subscription status (pause/resume/cancel)
      .patch(
        "/:id/status",
        async ({ request, params, body }) => {
          const userId = request.__auth?.userId;
          if (!userId) {
            throw new Error("Unauthorized");
          }

          const requestId = request.__log?.id || "unknown";
          logger.logDBOperation(requestId, "UPDATE", "subscriptions", { id: params.id, status: body.status });
          
          const subscription = await updateSubscriptionStatus(
            params.id,
            body.status,
            userId,
          );
          
          if (!subscription) {
            logger.warn(`[${requestId}] Subscription not found: ${params.id}`);
          } else {
            logger.logDBOperation(requestId, "UPDATE_COMPLETE", "subscriptions", { id: subscription._id, newStatus: body.status });
          }
          
          return subscription;
        },
        {
          body: t.Object({
            status: t.Union([
              t.Literal("active"),
              t.Literal("paused"),
              t.Literal("cancelled"),
            ]),
          }),
        },
      )

      // DELETE subscription
      .delete("/:id", async ({ request, params }) => {
        const userId = request.__auth?.userId;
        if (!userId) {
          throw new Error("Unauthorized");
        }

        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "DELETE", "subscriptions", { id: params.id });
        
        const deleted = await deleteSubscription(params.id, userId);
        
        if (!deleted) {
          logger.warn(`[${requestId}] Subscription not found for deletion: ${params.id}`);
        } else {
          logger.logDBOperation(requestId, "DELETE_COMPLETE", "subscriptions", { id: params.id });
        }
        
        return { success: deleted };
      }),
    ),
  );
