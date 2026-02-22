import { t } from "elysia";
import type { Elysia } from "elysia";
import { requireAuth } from "../middleware/auth";
import {
	completeOnboarding,
	getUserPreferences,
	hasCompletedOnboarding,
	saveUserPreferences,
} from "../services/preferences.service";
import { handleRouteError } from "../utils/error-handler";

export const preferencesRoutes = (app: Elysia) =>
	app.group("/preferences", (app) =>
		app.onError(handleRouteError).guard({ beforeHandle: requireAuth }, (app) =>
			app
				// GET user preferences
				.get("/", async ({ request }) => {
					const userId = request.__auth?.userId;
					if (!userId) throw new Error("Unauthorized");

					const preferences = await getUserPreferences(userId);
					return preferences;
				})

				// POST create/update preferences
				.post(
					"/",
					async ({ request, body }) => {
						const userId = request.__auth?.userId;
						if (!userId) throw new Error("Unauthorized");

						return await saveUserPreferences(body, userId);
					},
					{
						body: t.Object({
							budget: t.Number(),
							spendingAwareness: t.Optional(
								t.Union([
									t.Literal("know"),
									t.Literal("unsure"),
									t.Literal("no_idea"),
								]),
							),
							categories: t.Optional(t.Array(t.String())),
							painPoints: t.Optional(t.Array(t.String())),
							goals: t.Optional(t.Array(t.String())),
							alertTiming: t.Optional(
								t.Union([t.Literal("24h"), t.Literal("3d"), t.Literal("1w")]),
							),
						}),
					},
				)

				// GET check if onboarding is complete
				.get("/status", async ({ request }) => {
					const userId = request.__auth?.userId;
					if (!userId) throw new Error("Unauthorized");

					const isComplete = await hasCompletedOnboarding(userId);
					return { onboardingComplete: isComplete };
				})

				// PATCH mark onboarding as complete
				.patch(
					"/complete",
					async ({ request }) => {
						const userId = request.__auth?.userId;
						if (!userId) throw new Error("Unauthorized");

						const success = await completeOnboarding(userId);
						if (!success) {
							throw new Error("Failed to complete onboarding");
						}
						return { success: true };
					},
				),
		),
	);
