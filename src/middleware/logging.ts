import { Elysia } from "elysia";
import { randomUUID } from "crypto";
import { logger, colors, RequestLogData } from "./logger";

// Extend the Request interface to include our log data
declare global {
  interface Request {
    __log?: RequestLogData;
  }
}

// Create logging middleware as an Elysia plugin
export const loggingMiddleware = new Elysia({ name: "logging-middleware" })
  // Request ID assignment and initial logging
  .onRequest(({ request, set }) => {
    const requestId = randomUUID();

    // Store custom data on request
    request.__log = {
      id: requestId,
      startTime: performance.now(),
    };

    // Add request ID to response headers
    set.headers["x-request-id"] = requestId;

    // Log request start
    logger.logRequestStart(
      requestId,
      request.method,
      request.url,
      Object.fromEntries(request.headers.entries()),
    );
  })

  // Log route matching and params
  .onBeforeHandle(({ request, params, query, path }) => {
    const logData = request.__log;
    if (logData) {
      logger.logRouteMatch(
        logData.id,
        request.method,
        path,
        params || {},
        query || {},
      );
    }
  })

  // Transform to capture response body
  .onTransform(({ request, set }) => {
    const logData = request.__log;
    if (logData) {
      logger.debug(
        `${colors.cyan}⚡${colors.reset} [${logData.id}] Transform - Status: ${set.status || 200}`,
      );
    }
  })

  // Log successful responses
  .onAfterResponse(({ request, set, response }) => {
    const logData = request.__log;
    if (logData) {
      const duration = performance.now() - logData.startTime;
      const status = typeof set.status === "number" ? set.status : 200;

      // Check for slow requests
      logger.logSlowRequest(logData.id, duration);

      // Log the response
      logger.logResponse(
        logData.id,
        request.method,
        request.url,
        status,
        response,
      );
    }
  })

  // Global error handler with detailed logging
  .onError(({ request, set, error, code }) => {
    const logData = request.__log;
    const requestId = logData?.id || "unknown";
    const status = typeof set.status === "number" ? set.status : 500;

    // Log the error with full details
    logger.logError(
      requestId,
      error instanceof Error ? error : new Error(String(error)),
      `HTTP ${code}`,
    );

    // Also log as response for consistency
    logger.logResponse(
      requestId,
      request.method,
      request.url,
      status,
      null,
      error instanceof Error ? error : new Error(String(error)),
    );

    // Return user-friendly error
    return {
      success: false,
      error: {
        code,
        message: error instanceof Error ? error.message : String(error),
        requestId,
      },
    };
  });

// Re-export logger and other utilities for use in routes
export { logger, colors, CURRENT_LOG_LEVEL } from "./logger";
