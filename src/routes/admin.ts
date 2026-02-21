import { type Elysia, t } from "elysia";
import { requireAdminAuth } from "../middleware/auth";
import {
	adminCreateCategory,
	adminCreateSubscription,
	adminDeleteCategory,
	adminDeleteSubscription,
	adminGetAllCategories,
	adminGetAllSubscriptions,
	adminUpdateCategory,
	adminUpdateSubscription,
	loginAdmin,
	uploadFileToS3,
} from "../services";
import { handleRouteError } from "../utils/error-handler";
import { validateFile } from "../utils/file-upload";

export const adminRoutes = (app: Elysia) =>
	app.group("/admin", (app) =>
		app
			.onError(handleRouteError)

			.post(
				"/auth/login",
				async ({ body }) => {
					return await loginAdmin(body.username, body.password);
				},
				{
					body: t.Object({
						username: t.String(),
						password: t.String(),
					}),
				},
			)

			.guard({ beforeHandle: requireAdminAuth }, (app) =>
				app
					.post(
						"/upload",
						async ({ body: { file } }) => {
							validateFile(file);
							const buffer = Buffer.from(await file.arrayBuffer());
							const url = await uploadFileToS3(buffer, file.name, file.type);
							return { success: true, url };
						},
						{
							body: t.Object({
								file: t.File(),
							}),
						},
					)

					.get("/categories", async () => {
						return await adminGetAllCategories();
					})

					.post(
						"/categories",
						async ({ body }) => {
							const { logo, ...fields } = body;
							let logoUrl = fields.logoUrl;

							if (logo) {
								validateFile(logo);
								const buffer = Buffer.from(await logo.arrayBuffer());
								logoUrl = await uploadFileToS3(buffer, logo.name, logo.type);
							}

							return await adminCreateCategory({
								...fields,
								logoUrl,
							});
						},
						{
							body: t.Object({
								name: t.String(),
								icon: t.String(),
								color: t.String(),
								logoUrl: t.Optional(t.String()),
								logo: t.Optional(t.File()),
							}),
						},
					)

					.patch(
						"/categories/:id",
						async ({ body, params }) => {
							const { logo, ...fields } = body;
							let logoUrl = fields.logoUrl;

							if (logo) {
								validateFile(logo);
								const buffer = Buffer.from(await logo.arrayBuffer());
								logoUrl = await uploadFileToS3(buffer, logo.name, logo.type);
							}

							const result = await adminUpdateCategory(params.id, {
								...fields,
								logoUrl,
							});

							if (!result) {
								throw new Error("Category not found");
							}

							return result;
						},
						{
							body: t.Object({
								name: t.Optional(t.String()),
								icon: t.Optional(t.String()),
								color: t.Optional(t.String()),
								logoUrl: t.Optional(t.String()),
								logo: t.Optional(t.File()),
							}),
						},
					)

					.delete("/categories/:id", async ({ params }) => {
						const deleted = await adminDeleteCategory(params.id);
						if (!deleted) {
							throw new Error("Category not found");
						}
						return { success: true };
					})

					.get("/subscriptions", async () => {
						return await adminGetAllSubscriptions();
					})

					.post(
						"/subscriptions",
						async ({ body }) => {
							const { logo, amount, ...fields } = body;
							let logoUrl = fields.logoUrl;

							if (logo) {
								validateFile(logo);
								const buffer = Buffer.from(await logo.arrayBuffer());
								logoUrl = await uploadFileToS3(buffer, logo.name, logo.type);
							}

							return await adminCreateSubscription({
								...fields,
								amount,
								logoUrl,
							});
						},
						{
							body: t.Object({
								provider: t.String(),
								amount: t.Numeric(),
								currency: t.Optional(t.String()),
								categoryId: t.Optional(t.String()),
								logoUrl: t.Optional(t.String()),
								logo: t.Optional(t.File()),
							}),
						},
					)

					.patch(
						"/subscriptions/:id",
						async ({ body, params }) => {
							const { logo, amount, ...fields } = body;
							let logoUrl = fields.logoUrl;

							if (logo) {
								validateFile(logo);
								const buffer = Buffer.from(await logo.arrayBuffer());
								logoUrl = await uploadFileToS3(buffer, logo.name, logo.type);
							}

							const result = await adminUpdateSubscription(params.id, {
								...fields,
								amount,
								logoUrl,
							});

							if (!result) {
								throw new Error("Subscription template not found");
							}

							return result;
						},
						{
							body: t.Object({
								provider: t.Optional(t.String()),
								amount: t.Optional(t.Numeric()),
								currency: t.Optional(t.String()),
								categoryId: t.Optional(t.String()),
								logoUrl: t.Optional(t.String()),
								logo: t.Optional(t.File()),
							}),
						},
					)

					.delete("/subscriptions/:id", async ({ params }) => {
						const deleted = await adminDeleteSubscription(params.id);
						if (!deleted) {
							throw new Error("Subscription template not found");
						}
						return { success: true };
					}),
			),
	);
