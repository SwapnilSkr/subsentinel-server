import { Elysia, t } from "elysia";
import { registerDevice } from "../services";
import { logger } from "../middleware/logging";
import { requireAuth } from "../middleware/auth";

export const deviceRoutes = (app: Elysia) =>
  app.group("/register-device", (app) =>
    app.guard({ beforeHandle: requireAuth }, (app) =>
      app
      // POST register device token for FCM
      .post(
        "/",
        async ({ request, body }) => {
          const userId = request.__auth?.userId;
          if (!userId) {
            throw new Error("Unauthorized");
          }

          const requestId = request.__log?.id || "unknown";
          logger.logDBOperation(requestId, "UPSERT", "device_tokens", { 
            token: body.token.substring(0, 10) + "...", 
            platform: body.platform,
            userId,
          });
          
          const device = await registerDevice({
            token: body.token,
            platform: body.platform,
            userId,
          });
          
          logger.logDBOperation(requestId, "UPSERT_COMPLETE", "device_tokens", { id: device._id });
          return device;
        },
        {
          body: t.Object({
            token: t.String(),
            platform: t.String(),
          }),
        },
      ),
    ),
  );
