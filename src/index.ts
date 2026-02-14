import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { connectDB } from "./db";
import { initializeFirebase } from "./config";
import { loggingMiddleware, logger, colors, CURRENT_LOG_LEVEL } from "./middleware/logging";
import { 
  authRoutes, 
  subscriptionRoutes, 
  paymentRoutes, 
  deviceRoutes, 
  healthRoutes 
} from "./routes";

// Initialize all external services
await connectDB();
initializeFirebase();

const app = new Elysia()
  .use(cors())
  .use(loggingMiddleware)
  .decorate("logger", logger)

  // ==================== ROUTES ====================
  .use(authRoutes)
  .use(subscriptionRoutes)
  .use(paymentRoutes)
  .use(deviceRoutes)
  .use(healthRoutes)

  .listen(3000);

console.log(
  `${colors.green}🚀 SubSentinel Backend running at ${app.server?.hostname}:${app.server?.port}${colors.reset}`,
);
console.log(
  `${colors.cyan}📊 Logging level: ${CURRENT_LOG_LEVEL.toUpperCase()}${colors.reset}`
);
console.log(
  `${colors.gray}   Request logs include: timestamp, duration, status, body, headers, and more${colors.reset}`
);
