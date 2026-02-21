import { verifyAdminToken, verifyUserToken } from "../services";

export interface AuthContextData {
	userId: string;
	token: string;
}

export interface AdminAuthContextData {
	adminId: string;
	role: "admin";
	token: string;
}

declare global {
	interface Request {
		__auth?: AuthContextData;
		__adminAuth?: AdminAuthContextData;
	}
}

function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null;

	const [scheme, token] = authHeader.trim().split(/\s+/);
	if (!scheme || !token) return null;
	if (scheme.toLowerCase() !== "bearer") return null;
	return token;
}

export async function requireAuth(context: any) {
	const request = context.request as Request;
	const set = context.set as { status?: any };
	const authHeader = request.headers.get("authorization");
	const token = extractBearerToken(authHeader);

	if (!token) {
		set.status = 401;
		return { success: false, error: "Missing or invalid Authorization header" };
	}

	try {
		const payload = verifyUserToken(token);
		request.__auth = { userId: payload.userId, token };
	} catch (error: any) {
		set.status = 401;
		return { success: false, error: error?.message || "Unauthorized" };
	}
}

export async function requireAdminAuth(context: any) {
	const request = context.request as Request;
	const set = context.set as { status?: any };
	const authHeader = request.headers.get("authorization");
	const token = extractBearerToken(authHeader);

	if (!token) {
		set.status = 401;
		return { success: false, error: "Missing or invalid Authorization header" };
	}

	try {
		const payload = verifyAdminToken(token);
		request.__adminAuth = {
			adminId: payload.adminId,
			role: payload.role,
			token,
		};
	} catch (error: any) {
		set.status = 401;
		return { success: false, error: error?.message || "Unauthorized" };
	}
}
