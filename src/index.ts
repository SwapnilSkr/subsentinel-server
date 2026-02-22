import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { ENV, initializeServices } from "./config";
import { connectDB } from "./db";
import {
	CURRENT_LOG_LEVEL,
	colors,
	logger,
	loggingMiddleware,
} from "./middleware/logging";
import {
	adminRoutes,
	authRoutes,
	categoryRoutes,
	deviceRoutes,
	healthRoutes,
	paymentRoutes,
	preferencesRoutes,
	subscriptionRoutes,
} from "./routes";

// import { runAllSeeders } from "./seeders";

// Initialize all external services and database
await connectDB();
await initializeServices();
// await runAllSeeders();

const app = new Elysia()
	.use(cors())
	.use(loggingMiddleware)
	.decorate("logger", logger)

	// ==================== ROUTES ====================
	.use(authRoutes)
	.use(subscriptionRoutes)
	.use(categoryRoutes)
	.use(preferencesRoutes)
	.use(adminRoutes)
	.use(paymentRoutes)
	.use(deviceRoutes)
	.use(healthRoutes)

	.listen(ENV.PORT);

console.log(
	`${colors.green}🚀 SubSentinel Backend running at ${app.server?.hostname}:${app.server?.port}${colors.reset}`,
);
console.log(
	`${colors.cyan}📊 Logging level: ${CURRENT_LOG_LEVEL.toUpperCase()}${colors.reset}`,
);
console.log(
	`${colors.gray}   Request logs include: timestamp, duration, status, body, headers, and more${colors.reset}`,
);
