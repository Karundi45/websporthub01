import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing RLS policies for frontend fetching...');

  const queries = [
    // Users can read all users (needed for friend search)
    `DROP POLICY IF EXISTS "Public can read users" ON "User";`,
    `CREATE POLICY "Public can read users" ON "User" FOR SELECT USING (true);`,

    // Users can update their own user record
    `DROP POLICY IF EXISTS "Users can update own record" ON "User";`,
    `CREATE POLICY "Users can update own record" ON "User" FOR UPDATE USING (auth.uid()::text = id);`,

    // Workouts: Users can read their own workouts
    `DROP POLICY IF EXISTS "Users can read own workouts" ON "Workout";`,
    `CREATE POLICY "Users can read own workouts" ON "Workout" FOR SELECT USING (auth.uid()::text = "userId");`,

    // HeartRateLog: Users can read their own logs
    `DROP POLICY IF EXISTS "Users can read own HR logs" ON "HeartRateLog";`,
    `CREATE POLICY "Users can read own HR logs" ON "HeartRateLog" FOR SELECT USING (auth.uid()::text = "userId");`,

    // Activities: Public can read all activities
    `DROP POLICY IF EXISTS "Public can read activities" ON "Activity";`,
    `CREATE POLICY "Public can read activities" ON "Activity" FOR SELECT USING (true);`,

    // Products: Public can read products
    `DROP POLICY IF EXISTS "Public can read products" ON "Product";`,
    `CREATE POLICY "Public can read products" ON "Product" FOR SELECT USING (true);`,

    // GymPrograms: Public can read gym programs
    `DROP POLICY IF EXISTS "Public can read gym programs" ON "GymProgram";`,
    `CREATE POLICY "Public can read gym programs" ON "GymProgram" FOR SELECT USING (true);`
  ];

  for (const q of queries) {
    try {
      await prisma.$executeRawUnsafe(q);
      console.log(`Executed: ${q}`);
    } catch (e) {
      console.error(`Error on query: ${q}`);
      console.error(e);
    }
  }

  console.log('All frontend RLS policies applied!');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
