import { t } from "elysia";
import type { Elysia } from "elysia";
import { requireAuth } from "../middleware/auth";
import {
	createCategory,
	deleteCategory,
	getAllCategories,
	updateCategory,
} from "../services";
import { handleRouteError } from "../utils/error-handler";

export const categoryRoutes = (app: Elysia) =>
	app.group("/categories", (app) =>
		app.onError(handleRouteError).guard({ beforeHandle: requireAuth }, (app) =>
			app
				// GET all categories (defaults + user's custom)
				.get("/", async ({ request }) => {
					const userId = request.__auth?.userId;
					if (!userId) throw new Error("Unauthorized");

					return await getAllCategories(userId);
				})

				// POST create custom category
				.post(
					"/",
					async ({ request, body }) => {
						const userId = request.__auth?.userId;
						if (!userId) throw new Error("Unauthorized");

						return await createCategory(body, userId);
					},
					{
						body: t.Object({
							name: t.String(),
							icon: t.String(),
							color: t.String(),
							logoUrl: t.Optional(t.String()),
						}),
					},
				)

				// PATCH update custom category
				.patch(
					"/:id",
					async ({ request, params, body }) => {
						const userId = request.__auth?.userId;
						if (!userId) throw new Error("Unauthorized");

						const category = await updateCategory(params.id, body, userId);
						if (!category) {
							throw new Error("Category not found or cannot be modified");
						}
						return category;
					},
					{
						body: t.Object({
							name: t.Optional(t.String()),
							icon: t.Optional(t.String()),
							color: t.Optional(t.String()),
							logoUrl: t.Optional(t.String()),
						}),
					},
				)

				// DELETE custom category
				.delete("/:id", async ({ request, params }) => {
					const userId = request.__auth?.userId;
					if (!userId) throw new Error("Unauthorized");

					const deleted = await deleteCategory(params.id, userId);
					if (!deleted) {
						throw new Error("Category not found or cannot be deleted");
					}
					return { success: true };
				}),
		),
	);
