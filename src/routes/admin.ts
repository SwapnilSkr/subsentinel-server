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
} from "../services";
import { requireAdminAuth } from "../middleware/auth";
import {
  extractFieldsAndFile,
  validateFile,
  type MultipartFields,
} from "../utils/file-upload";
import { uploadFileToS3 } from "../services";

interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
  logoUrl?: string;
}

interface SubscriptionFormData {
  provider: string;
  amount: string;
  currency?: string;
  categoryId?: string;
  logoUrl?: string;
}

async function processCategoryRequest(
  request: Request,
  body: any,
): Promise<any> {
  const contentType = request.headers.get("content-type");

  if (!contentType?.includes("multipart/form-data")) {
    return body;
  }

  const { fields, file } = await extractFieldsAndFile(request);

  const result: any = {
    name: fields.name,
    icon: fields.icon,
    color: fields.color,
  };

  if (fields.logoUrl) {
    result.logoUrl = fields.logoUrl;
  }

  if (file) {
    validateFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    result.logoUrl = await uploadFileToS3(buffer, file.name, file.type);
  }

  return result;
}

async function processSubscriptionRequest(
  request: Request,
  body: any,
): Promise<any> {
  const contentType = request.headers.get("content-type");

  if (!contentType?.includes("multipart/form-data")) {
    return body;
  }

  const { fields, file } = await extractFieldsAndFile(request);

  const result: any = {
    provider: fields.provider,
    amount: Number(fields.amount),
  };

  if (fields.currency) {
    result.currency = fields.currency;
  }

  if (fields.categoryId) {
    result.categoryId = fields.categoryId;
  }

  if (fields.logoUrl) {
    result.logoUrl = fields.logoUrl;
  }

  if (file) {
    validateFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    result.logoUrl = await uploadFileToS3(buffer, file.name, file.type);
  }

  return result;
}

export const adminRoutes = (app: Elysia) =>
  app.group("/admin", (app) =>
    app
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

      .guard({ beforeHandle: requireAdminAuth }, (app) =>
        app
          .post("/upload", async ({ request, set }) => {
            try {
              const formData = await request.formData();
              const file = formData.get("file");

              if (!file || !(file instanceof File)) {
                set.status = 400;
                return { success: false, error: "No file provided" };
              }

              validateFile(file);
              const buffer = Buffer.from(await file.arrayBuffer());
              const url = await uploadFileToS3(buffer, file.name, file.type);
              return { success: true, url };
            } catch (error: any) {
              set.status = 500;
              return { success: false, error: error.message };
            }
          })

          .get("/categories", async () => {
            return await adminGetAllCategories();
          })

          .post(
            "/categories",
            async ({ request, set }) => {
              try {
                const data = await processCategoryRequest(request, null);
                return await adminCreateCategory(data);
              } catch (error: any) {
                set.status = 400;
                return { success: false, error: error.message };
              }
            },
          )

          .patch(
            "/categories/:id",
            async ({ request, params, set }) => {
              try {
                const data = await processCategoryRequest(request, null);
                const result = await adminUpdateCategory(params.id, data);
                if (!result) {
                  set.status = 404;
                  return { success: false, error: "Category not found" };
                }
                return result;
              } catch (error: any) {
                set.status = 400;
                return { success: false, error: error.message };
              }
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

          .get("/subscriptions", async () => {
            return await adminGetAllSubscriptions();
          })

          .post(
            "/subscriptions",
            async ({ request, set }) => {
              try {
                const data = await processSubscriptionRequest(request, null);
                return await adminCreateSubscription(data);
              } catch (error: any) {
                set.status = 400;
                return { success: false, error: error.message };
              }
            },
          )

          .patch(
            "/subscriptions/:id",
            async ({ request, params, set }) => {
              try {
                const data = await processSubscriptionRequest(request, null);
                const result = await adminUpdateSubscription(params.id, data);
                if (!result) {
                  set.status = 404;
                  return {
                    success: false,
                    error: "Subscription template not found",
                  };
                }
                return result;
              } catch (error: any) {
                set.status = 400;
                return { success: false, error: error.message };
              }
            },
          )

          .delete("/subscriptions/:id", async ({ params, set }) => {
            const deleted = await adminDeleteSubscription(params.id);
            if (!deleted) {
              set.status = 404;
              return {
                success: false,
                error: "Subscription template not found",
              };
            }
            return { success: true };
          }),
      ),
  );
