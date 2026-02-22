import { type Document, type Model, model, models, Schema, type Types } from "mongoose";

export interface IUserPreferences extends Document {
	userId: Types.ObjectId;
	budget: number;
	spendingAwareness: "know" | "unsure" | "no_idea";
	categories: Types.ObjectId[];
	painPoints: string[];
	goals: string[];
	alertTiming: "24h" | "3d" | "1w";
	onboardingComplete: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const userPreferencesSchema = new Schema<IUserPreferences>(
	{
		userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
		budget: { type: Number, required: true, default: 0 },
		spendingAwareness: {
			type: String,
			enum: ["know", "unsure", "no_idea"],
			default: "unsure",
		},
		categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
		painPoints: [{ type: String }],
		goals: [{ type: String }],
		alertTiming: {
			type: String,
			enum: ["24h", "3d", "1w"],
			default: "24h",
		},
		onboardingComplete: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

userPreferencesSchema.index({ userId: 1 }, { unique: true });

export const UserPreferences =
	(models.UserPreferences as Model<IUserPreferences>) ||
	model<IUserPreferences>("UserPreferences", userPreferencesSchema);
