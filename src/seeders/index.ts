import { seedDefaultAdmin } from "./admin.seeder";
import { seedDefaultCategories } from "./category.seeder";
import { seedDefaultSubscriptions } from "./subscription.seeder";

export async function runAllSeeders(): Promise<void> {
  await seedDefaultAdmin();
  await seedDefaultCategories();
  await seedDefaultSubscriptions();
}
