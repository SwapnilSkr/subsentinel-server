import type { Elysia } from "elysia";
import { logger } from "../middleware/logging";
import { handleRouteError } from "../utils/error-handler";

export const healthRoutes = (app: Elysia) =>
	app
		.onError(handleRouteError)

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
		}));
