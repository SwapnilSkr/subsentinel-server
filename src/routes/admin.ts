import { Elysia, t } from "elysia";
import {
  loginAdmin,
  adminGetAllCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminGetAllSubscriptions,
  adminCreateSubscription,
  adminUpdateSubscription,
  adminDeleteSubscription,
  uploadFileToS3,
} from "../services";
import { requireAdminAuth } from "../middleware/auth";

export const adminRoutes = (app: Elysia) =>
  app.group("/admin", (app) =>
    app
      // Public: Admin login
      .post(
        "/auth/login",
        async ({ body, set }) => {
          try {
            const result = await loginAdmin(body.username, body.password);
            return result;
          } catch (error: any) {
            set.status = 401;
            return { success: false, error: error.message };
          }
        },
        {
          body: t.Object({
            username: t.String(),
            password: t.String(),
          }),
        },
      )

      // Protected admin routes
      .guard({ beforeHandle: requireAdminAuth }, (app) =>
        app
          // File upload
          .post("/upload", async ({ request, set }) => {
            try {
              const formData = await request.formData();
              const file = formData.get("file");

              if (!file || !(file instanceof File)) {
                set.status = 400;
                return { success: false, error: "No file provided" };
              }

              const buffer = Buffer.from(await file.arrayBuffer());
              const url = await uploadFileToS3(buffer, file.name, file.type);
              return { success: true, url };
            } catch (error: any) {
              set.status = 500;
              return { success: false, error: error.message };
            }
          })

          // Category CRUD
          .get("/categories", async () => {
            return await adminGetAllCategories();
          })
          .post(
            "/categories",
            async ({ body }) => {
              return await adminCreateCategory(body);
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
          .patch(
            "/categories/:id",
            async ({ params, body, set }) => {
              const result = await adminUpdateCategory(params.id, body);
              if (!result) {
                set.status = 404;
                return { success: false, error: "Category not found" };
              }
              return result;
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
          .delete("/categories/:id", async ({ params, set }) => {
            const deleted = await adminDeleteCategory(params.id);
            if (!deleted) {
              set.status = 404;
              return { success: false, error: "Category not found" };
            }
            return { success: true };
          })

          // Subscription Template CRUD
          .get("/subscriptions", async () => {
            return await adminGetAllSubscriptions();
          })
          .post(
            "/subscriptions",
            async ({ body }) => {
              return await adminCreateSubscription(body);
            },
            {
              body: t.Object({
                provider: t.String(),
                amount: t.Number(),
                currency: t.Optional(t.String()),
                categoryId: t.Optional(t.String()),
                logoUrl: t.Optional(t.String()),
              }),
            },
          )
          .patch(
            "/subscriptions/:id",
            async ({ params, body, set }) => {
              const result = await adminUpdateSubscription(params.id, body);
              if (!result) {
                set.status = 404;
                return { success: false, error: "Subscription template not found" };
              }
              return result;
            },
            {
              body: t.Object({
                provider: t.Optional(t.String()),
                amount: t.Optional(t.Number()),
                currency: t.Optional(t.String()),
                categoryId: t.Optional(t.String()),
                logoUrl: t.Optional(t.String()),
              }),
            },
          )
          .delete("/subscriptions/:id", async ({ params, set }) => {
            const deleted = await adminDeleteSubscription(params.id);
            if (!deleted) {
              set.status = 404;
              return { success: false, error: "Subscription template not found" };
            }
            return { success: true };
          }),
      ),
  );
