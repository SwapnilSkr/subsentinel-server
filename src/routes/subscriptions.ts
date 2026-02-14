import { Elysia, t } from "elysia";
import { 
  getAllSubscriptions, 
  getSubscriptionSummary, 
  createSubscription, 
  updateSubscriptionStatus, 
  deleteSubscription 
} from "../services";
import { logger } from "../middleware/logging";

const objectIdPattern = "^[a-fA-F0-9]{24}$";

export const subscriptionRoutes = (app: Elysia) =>
  app.group("/subscriptions", (app) =>
    app
      // GET all subscriptions
      .get("/", async ({ request }) => {
        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "FIND", "subscriptions", { filter: {}, sort: { next_billing: 1 } });
        
        const subscriptions = await getAllSubscriptions();
        
        logger.logDBOperation(requestId, "FIND_COMPLETE", "subscriptions", { count: subscriptions.length });
        return subscriptions;
      })

      // GET subscription summary (for dashboard)
      .get("/summary", async ({ request }) => {
        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "FIND", "subscriptions", { filter: { status: "active" } });
        
        const summary = await getSubscriptionSummary();

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
          const requestId = request.__log?.id || "unknown";
          logger.logDBOperation(requestId, "CREATE", "subscriptions", { provider: body.provider, amount: body.amount });
          
          const subscription = await createSubscription(body);
          
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
            userId: t.Optional(t.String({ pattern: objectIdPattern })),
          }),
        },
      )

      // PATCH update subscription status (pause/resume/cancel)
      .patch(
        "/:id/status",
        async ({ request, params, body }) => {
          const requestId = request.__log?.id || "unknown";
          logger.logDBOperation(requestId, "UPDATE", "subscriptions", { id: params.id, status: body.status });
          
          const subscription = await updateSubscriptionStatus(params.id, body.status);
          
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
        const requestId = request.__log?.id || "unknown";
        logger.logDBOperation(requestId, "DELETE", "subscriptions", { id: params.id });
        
        const deleted = await deleteSubscription(params.id);
        
        if (!deleted) {
          logger.warn(`[${requestId}] Subscription not found for deletion: ${params.id}`);
        } else {
          logger.logDBOperation(requestId, "DELETE_COMPLETE", "subscriptions", { id: params.id });
        }
        
        return { success: deleted };
      }),
  );
