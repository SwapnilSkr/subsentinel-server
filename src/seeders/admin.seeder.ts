import bcrypt from "bcryptjs";
import { ENV } from "../config";
import { Admin } from "../models";

export async function seedDefaultAdmin(): Promise<void> {
	const existing = await Admin.findOne({ username: ENV.ADMIN_USERNAME });
	if (existing) return;

	const hashedPassword = await bcrypt.hash(ENV.ADMIN_PASSWORD, 10);
	await Admin.create({
		username: ENV.ADMIN_USERNAME,
		password: hashedPassword,
		displayName: "Admin",
	});
	console.log("Seeded default admin");
}
