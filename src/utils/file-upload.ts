interface BunFile {
	constructor: { name: string };
	name: string;
	type: string;
	size: number;
	arrayBuffer(): Promise<ArrayBuffer>;
}

const ALLOWED_MIME_TYPES = new Set([
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	"image/x-icon",
	"image/bmp",
	"image/tiff",
	"image/vnd.adobe.photoshop",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export type MultipartValue = string | BunFile;

export interface MultipartFields {
	[key: string]: MultipartValue;
}

function isFile(value: unknown): value is BunFile {
	return (
		value !== null &&
		typeof value === "object" &&
		"name" in value &&
		"type" in value &&
		"size" in value &&
		typeof (value as BunFile).arrayBuffer === "function"
	);
}

export async function extractFieldsAndFile(
	request: Request,
	fileFieldName: string = "logo",
): Promise<{ fields: MultipartFields; file: BunFile | null }> {
	const formData = await request.formData();

	const fields: MultipartFields = {};
	let file: BunFile | null = null;

	for (const [key, value] of formData.entries()) {
		if (key === fileFieldName && isFile(value)) {
			file = value;
		} else if (isFile(value)) {
		} else {
			fields[key] = value;
		}
	}

	return { fields, file };
}

export function validateFile(file: BunFile): void {
	if (!ALLOWED_MIME_TYPES.has(file.type)) {
		throw new Error(
			`Invalid file type: ${file.type}. Allowed types: ${Array.from(
				ALLOWED_MIME_TYPES,
			).join(", ")}`,
		);
	}

	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`File size exceeds limit of 5MB`);
	}
}
