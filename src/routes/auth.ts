import { Elysia, t } from "elysia";
import { sendOTP, verifyOTPAndLogin, loginWithGoogle } from "../services";

export const authRoutes = (app: Elysia) =>
  app.group("/auth", (app) =>
    app
      // 1. Send OTP
      .post(
        "/otp/send",
        async ({ body, set }) => {
          try {
            await sendOTP(body.phone);
            return { success: true, message: "OTP sent" };
          } catch (e: any) {
            set.status = 400;
            return { success: false, error: e.message };
          }
        },
        {
          body: t.Object({ phone: t.String() }),
        },
      )

      // 2. Verify OTP & Login
      .post(
        "/otp/verify",
        async ({ body, set }) => {
          try {
            const result = await verifyOTPAndLogin(body.phone, body.code);
            return result;
          } catch (e: any) {
            set.status = 401;
            return { success: false, error: e.message };
          }
        },
        {
          body: t.Object({ phone: t.String(), code: t.String() }),
        },
      )

      // 3. Google/Firebase Login
      .post(
        "/google",
        async ({ body, set }) => {
          try {
            const result = await loginWithGoogle(body.token);
            return result;
          } catch (e: any) {
            set.status = 401;
            return { success: false, error: e.message };
          }
        },
        {
          body: t.Object({ token: t.String() }),
        },
      ),
  );
