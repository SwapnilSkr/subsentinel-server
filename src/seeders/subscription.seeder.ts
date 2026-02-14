import { Category, Subscription } from "../models";

const DEFAULT_SUBSCRIPTIONS = [
  { provider: "Netflix", amount: 15.49, currency: "USD", category: "Entertainment" },
  { provider: "Spotify", amount: 10.99, currency: "USD", category: "Music" },
  { provider: "YouTube Premium", amount: 13.99, currency: "USD", category: "Entertainment" },
  { provider: "Disney+", amount: 13.99, currency: "USD", category: "Entertainment" },
  { provider: "Apple Music", amount: 10.99, currency: "USD", category: "Music" },
  { provider: "HBO Max", amount: 15.99, currency: "USD", category: "Entertainment" },
  { provider: "Amazon Prime", amount: 14.99, currency: "USD", category: "Shopping" },
  { provider: "iCloud+", amount: 2.99, currency: "USD", category: "Cloud Storage" },
  { provider: "Google One", amount: 2.99, currency: "USD", category: "Cloud Storage" },
  { provider: "Dropbox", amount: 11.99, currency: "USD", category: "Cloud Storage" },
  { provider: "ChatGPT Plus", amount: 20.00, currency: "USD", category: "Productivity" },
  { provider: "Xbox Game Pass", amount: 16.99, currency: "USD", category: "Gaming" },
];

export async function seedDefaultSubscriptions(): Promise<void> {
  const existingCount = await Subscription.countDocuments({ isDefault: true });
  if (existingCount > 0) return;

  const categories = await Category.find({ isDefault: true });
  const categoryMap = new Map(categories.map((c) => [c.name, c._id]));

  const templates = DEFAULT_SUBSCRIPTIONS.map((sub) => ({
    provider: sub.provider,
    amount: sub.amount,
    currency: sub.currency,
    isDefault: true,
    categoryId: categoryMap.get(sub.category) || null,
    next_billing: new Date(),
  }));

  await Subscription.insertMany(templates);
  console.log(`Seeded ${templates.length} default subscription templates`);
}
