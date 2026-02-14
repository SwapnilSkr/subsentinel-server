import { Category } from "../models";

const DEFAULT_CATEGORIES = [
  { name: "Entertainment", icon: "movie", color: "#E50914" },
  { name: "Music", icon: "music_note", color: "#1DB954" },
  { name: "Productivity", icon: "work", color: "#4285F4" },
  { name: "Cloud Storage", icon: "cloud", color: "#5F6368" },
  { name: "Gaming", icon: "sports_esports", color: "#9147FF" },
  { name: "News", icon: "newspaper", color: "#1A73E8" },
  { name: "Education", icon: "school", color: "#FF6D00" },
  { name: "Health & Fitness", icon: "fitness_center", color: "#0F9D58" },
  { name: "Finance", icon: "account_balance", color: "#34A853" },
  { name: "Communication", icon: "chat", color: "#00BCD4" },
  { name: "Shopping", icon: "shopping_bag", color: "#FF9800" },
  { name: "Food & Delivery", icon: "restaurant", color: "#F44336" },
  { name: "Transportation", icon: "directions_car", color: "#607D8B" },
  { name: "Utilities", icon: "build", color: "#795548" },
];

export async function seedDefaultCategories(): Promise<void> {
  const existingCount = await Category.countDocuments({ isDefault: true });
  if (existingCount > 0) return;

  const defaults = DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    isDefault: true,
    userId: null,
  }));

  await Category.insertMany(defaults);
  console.log(`Seeded ${defaults.length} default categories`);
}
