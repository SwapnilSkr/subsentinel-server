import { randomUUID } from "node:crypto";
import type { Elysia } from "elysia";
import { logger } from "./logger";

// Extend the global Request interface to include our log data
declare global {
	interface Request {
		__log?: import("./logger").RequestLogData & {
			logged?: boolean;
			error?: Error;
		};
	}
}

/**
 * Logging Middleware for ElysiaJS
 *
 * This middleware provides detailed logging for all requests and responses,
 * including request headers, execution duration, response status, and bodies.
 *
 * It is implemented as a function-based plugin to ensure lifecycle hooks
 * are correctly inherited by the parent application.
 */
export const loggingMiddleware = (app: Elysia) =>
	app
		// 1. Request Initialization: Generate ID and mark start time
		.onRequest(({ request, set }) => {
			const requestId = randomUUID();

			request.__log = {
				id: requestId,
				startTime: performance.now(),
				logged: false,
			};

			// Provide request ID in response headers for client-side tracking
			set.headers["x-request-id"] = requestId;

			// Log the initial request details
			logger.logRequestStart(
				requestId,
				request.method,
				request.url,
				Object.fromEntries(request.headers.entries()),
			);
		})

		// 2. Route Matching: Log which route was matched and with what params
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

		// 3. Response Completion: The single point of truth for response logging
		.onAfterResponse(({ request, set }) => {
			const logData = request.__log;
			if (logData && !logData.logged) {
				const duration = performance.now() - logData.startTime;
				const status = typeof set.status === "number" ? set.status : 200;

				// Log slow requests as warnings
				logger.logSlowRequest(logData.id, duration);

				// Log the response details (successful or error-based)
				logger.logResponse(
					logData.id,
					request.method,
					request.url,
					status,
					logData.error, // Include error details if captured in onError
				);

				logData.logged = true;
			}
		})

		// 4. Global Error Handling: Capture errors to be logged in the final response hook
		.onError(({ request, set, error, code }) => {
			const logData = request.__log;
			const requestId = logData?.id || "unknown";

			// Determine status code if not already set
			if (!set.status || set.status === 200) {
				if (code === "NOT_FOUND") set.status = 404;
				else if (code === "VALIDATION") set.status = 400;
				else set.status = 500;
			}

			// Capture the error in logData for the onAfterResponse hook
			const errorObj =
				error instanceof Error ? error : new Error(String(error));
			if (logData) {
				logData.error = errorObj;
			}

			// Log the error stack separately for debugging
			logger.logError(requestId, errorObj, `HTTP ${code}`);

			// Return a consistent error structure to the client
			return {
				success: false,
				error: {
					code,
					message: errorObj.message,
					requestId,
				},
			};
		});

// Re-export logger and other utilities for use in routes
export { CURRENT_LOG_LEVEL, colors, logger } from "./logger";
