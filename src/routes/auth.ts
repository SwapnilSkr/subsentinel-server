import type { Elysia } from "elysia";
import { t } from "elysia";
import { loginWithGoogle, sendOTP, verifyOTPAndLogin } from "../services";
import { handleRouteError } from "../utils/error-handler";

export const authRoutes = (app: Elysia) =>
	app.group("/auth", (app) =>
		app
			.onError(handleRouteError)
			// 1. Send OTP
			.post(
				"/otp/send",
				async ({ body }) => {
					await sendOTP(body.phone);
					return { success: true, message: "OTP sent" };
				},
				{
					body: t.Object({ phone: t.String() }),
				},
			)

			// 2. Verify OTP & Login
			.post(
				"/otp/verify",
				async ({ body }) => {
					return await verifyOTPAndLogin(body.phone, body.code);
				},
				{
					body: t.Object({ phone: t.String(), code: t.String() }),
				},
			)

			// 3. Google/Firebase Login
			.post(
				"/google",
				async ({ body }) => {
					return await loginWithGoogle(body.token);
				},
				{
					body: t.Object({ token: t.String() }),
				},
			),
	);
