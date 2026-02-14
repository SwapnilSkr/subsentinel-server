import { Elysia, t } from "elysia";
import { DeviceToken } from "../models";
import { logger } from "../middleware/logging";

export const deviceRoutes = (app: Elysia) =>
  app.group("/register-device", (app) =>
    app
      // POST register device token for FCM
      .post(
        "/",
        async ({ request, body }) => {
          const requestId = request.__log?.id || "unknown";
          logger.logDBOperation(requestId, "UPSERT", "device_tokens", { 
            token: body.token.substring(0, 10) + "...", 
            platform: body.platform 
          });
          
          const device = await DeviceToken.findOneAndUpdate(
            { token: body.token },
            { userId: body.userId, platform: body.platform },
            { upsert: true, new: true },
          );
          
          logger.logDBOperation(requestId, "UPSERT_COMPLETE", "device_tokens", { id: device._id });
          return device;
        },
        {
          body: t.Object({
            token: t.String(),
            userId: t.Optional(t.String()),
            platform: t.String(),
          }),
        },
      )
  );
