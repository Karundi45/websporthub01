import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Enabling RLS on FriendRequest and Friendship...');

  const queries = [
    `ALTER TABLE "FriendRequest" ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE "Friendship" ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Users can view their own requests" ON "FriendRequest";`,
    `CREATE POLICY "Users can view their own requests" ON "FriendRequest" 
      FOR SELECT USING (auth.uid()::text = "senderId" OR auth.uid()::text = "receiverId");`,
    `DROP POLICY IF EXISTS "Users can send requests" ON "FriendRequest";`,
    `CREATE POLICY "Users can send requests" ON "FriendRequest" 
      FOR INSERT WITH CHECK (auth.uid()::text = "senderId");`,
    `DROP POLICY IF EXISTS "Users can update their received requests" ON "FriendRequest";`,
    `CREATE POLICY "Users can update their received requests" ON "FriendRequest" 
      FOR UPDATE USING (auth.uid()::text = "receiverId");`,
    `DROP POLICY IF EXISTS "Users can view their friendships" ON "Friendship";`,
    `CREATE POLICY "Users can view their friendships" ON "Friendship" 
      FOR SELECT USING (true);`,
    `DROP POLICY IF EXISTS "Users can create friendships" ON "Friendship";`,
    `CREATE POLICY "Users can create friendships" ON "Friendship" 
      FOR INSERT WITH CHECK (auth.uid()::text = "user1Id" OR auth.uid()::text = "user2Id");`,
    `DROP POLICY IF EXISTS "Users can delete friendships" ON "Friendship";`,
    `CREATE POLICY "Users can delete friendships" ON "Friendship" 
      FOR DELETE USING (auth.uid()::text = "user1Id" OR auth.uid()::text = "user2Id");`
  ];

  for (const q of queries) {
    await prisma.$executeRawUnsafe(q);
  }

  console.log('RLS policies applied!');
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
