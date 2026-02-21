import type { Elysia } from "elysia";
import { t } from "elysia";
import { requireAuth } from "../middleware/auth";
import { logger } from "../middleware/logging";
import { createCheckoutSession } from "../services";
import { handleRouteError } from "../utils/error-handler";

export const paymentRoutes = (app: Elysia) =>
	app.group("/checkout", (app) =>
		app.onError(handleRouteError).guard({ beforeHandle: requireAuth }, (app) =>
			app
				// POST create checkout session
				.post(
					"/",
					async ({ request, body }) => {
						const userId = request.__auth?.userId;
						if (!userId) {
							throw new Error("Unauthorized");
						}

						const requestId = request.__log?.id || "unknown";
						logger.info(
							`[${requestId}] Creating checkout session for product: ${body.productId}, customer: ${body.email}`,
						);

						const result = await createCheckoutSession(body);

						logger.info(
							`[${requestId}] Checkout session created successfully: ${result.url}`,
						);
						return result;
					},
					{
						body: t.Object({
							productId: t.String(),
							email: t.String(),
							name: t.String(),
						}),
					},
				),
		),
	);
