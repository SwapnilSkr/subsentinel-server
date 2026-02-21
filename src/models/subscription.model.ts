import {
	type Document,
	type Model,
	model,
	models,
	Schema,
	type Types,
} from "mongoose";

export interface ISubscription extends Document {
	provider: string;
	amount: number;
	currency: string;
	next_billing?: Date;
	status: "active" | "paused" | "cancelled";
	categoryId?: Types.ObjectId;
	logoUrl?: string;
	isDefault: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
	{
		provider: { type: String, required: true },
		amount: { type: Number, required: true },
		currency: { type: String, default: "USD" },
		next_billing: { type: Date },
		status: {
			type: String,
			enum: ["active", "paused", "cancelled"],
			default: "active",
		},
		categoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
		logoUrl: { type: String },
		isDefault: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

export const Subscription =
	(models.Subscription as Model<ISubscription>) ||
	model<ISubscription>("Subscription", subscriptionSchema);
