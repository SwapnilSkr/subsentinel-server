import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { connectDB } from "./db";
import { initializeServices, ENV } from "./config";
import {
  loggingMiddleware,
  logger,
  colors,
  CURRENT_LOG_LEVEL,
} from "./middleware/logging";
import {
  authRoutes,
  subscriptionRoutes,
  paymentRoutes,
  deviceRoutes,
  healthRoutes,
  categoryRoutes,
  adminRoutes,
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
