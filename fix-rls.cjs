const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRLS() {
  const tables = ['_ChallengeParticipants', '_UserFollows', '_SavedPosts', '_GroupMembers'];
  
  for (const table of tables) {
    console.log('Fixing RLS for ' + table);
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      
      // Drop policy if exists to avoid error
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow authenticated access" ON "${table}";`);
      
      // Create policy
      await prisma.$executeRawUnsafe(`CREATE POLICY "Allow authenticated access" ON "${table}" FOR ALL USING (auth.role() = 'authenticated');`);
      console.log('Successfully fixed ' + table);
    } catch (e) {
      console.log('Error on ' + table + ':', e.message);
    }
  }
}

fixRLS()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
