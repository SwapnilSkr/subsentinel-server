import type { ErrorHandler } from "elysia";

export const handleRouteError = (({ code, error, set }) => {
	const message =
		error instanceof Error ? error.message : "Internal Server Error";

	if (code === "VALIDATION" && "all" in error) {
		set.status = 400;
		return { success: false, error: error.all };
	}

	const lowerMessage = message.toLowerCase();
	if (
		lowerMessage === "invalid credentials" ||
		lowerMessage === "unauthorized"
	) {
		set.status = 401;
	} else if (lowerMessage.includes("not found") || code === "NOT_FOUND") {
		set.status = 404;
	} else if (set.status === 200) {
		set.status = 500;
	}

	return { success: false, error: message };
	// biome-ignore lint/suspicious/noExplicitAny: Elysia ErrorHandler types are complex and require any for wide compatibility
}) as ErrorHandler<any, any>;
