import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NavigationTab data...');

  const tabs = [
    { path: '/', label: 'Home', iconName: 'Activity', order: 0, isActive: true },
    { path: '/track', label: 'Live Track', iconName: 'Map', order: 1, isActive: true },
    { path: '/explore', label: 'Explore', iconName: 'Compass', order: 2, isActive: true },
    { path: '/social', label: 'Community', iconName: 'MessageSquare', order: 3, isActive: true },
    { path: '/profile', label: 'Me', iconName: 'User', order: 4, isActive: true },
  ];

  for (const tab of tabs) {
    await prisma.navigationTab.upsert({
      where: { path: tab.path },
      update: tab,
      create: tab,
    });
  }

  console.log('Successfully seeded NavigationTab data.');
  
  // Note: RLS for NavigationTab requires SQL execution on Supabase.
  // Since we don't have direct SQL admin access through Prisma easily,
  // we can use Prisma `$executeRaw` to enable RLS and create policy.
  try {
    console.log('Setting up RLS for NavigationTab...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "NavigationTab" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_policies WHERE tablename = 'NavigationTab' AND policyname = 'Allow public read access to NavigationTab'
          ) THEN
              CREATE POLICY "Allow public read access to NavigationTab" ON "NavigationTab" FOR SELECT USING (true);
          END IF;
      END
      $$;
    `);
    console.log('Successfully configured RLS.');
  } catch (err) {
    console.error('Failed to configure RLS (it might already exist or lack permissions):', err);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
