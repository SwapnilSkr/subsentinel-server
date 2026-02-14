import { Elysia } from "elysia";
import { logger } from "../middleware/logging";

export const healthRoutes = (app: Elysia) =>
  app
    // GET health check
    .get("/health", ({ request }) => {
      const requestId = request.__log?.id || "unknown";
      logger.debug(`[${requestId}] Health check requested`);
      return { status: "ok", timestamp: new Date().toISOString(), requestId };
    })

    // GET root endpoint
    .get("/", () => ({
      status: "SubSentinel Backend",
      message: "Welcome to SubSentinel Backend",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    }));
