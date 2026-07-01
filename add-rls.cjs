const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingRLS() {
  console.log('Adding RLS to GymProgram, FriendRequest, and Friendship...');

  try {
    // 1. GymProgram
    await prisma.$executeRawUnsafe(`ALTER TABLE "GymProgram" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "GymProgram viewable by everyone" ON "GymProgram";`);
    await prisma.$executeRawUnsafe(`CREATE POLICY "GymProgram viewable by everyone" ON "GymProgram" FOR SELECT USING (true);`);

    // 2. FriendRequest
    await prisma.$executeRawUnsafe(`ALTER TABLE "FriendRequest" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "FriendRequests viewable by sender or receiver" ON "FriendRequest";`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can send friend requests" ON "FriendRequest";`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can update received friend requests" ON "FriendRequest";`);

    await prisma.$executeRawUnsafe(`CREATE POLICY "FriendRequests viewable by sender or receiver" ON "FriendRequest" FOR SELECT USING (auth.uid()::text = "senderId" OR auth.uid()::text = "receiverId");`);
    await prisma.$executeRawUnsafe(`CREATE POLICY "Users can send friend requests" ON "FriendRequest" FOR INSERT WITH CHECK (auth.uid()::text = "senderId");`);
    await prisma.$executeRawUnsafe(`CREATE POLICY "Users can update received friend requests" ON "FriendRequest" FOR UPDATE USING (auth.uid()::text = "receiverId");`);

    // 3. Friendship
    await prisma.$executeRawUnsafe(`ALTER TABLE "Friendship" ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Friendships viewable by users involved" ON "Friendship";`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can insert friendships" ON "Friendship";`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can delete friendships" ON "Friendship";`);

    await prisma.$executeRawUnsafe(`CREATE POLICY "Friendships viewable by users involved" ON "Friendship" FOR SELECT USING (auth.uid()::text = "user1Id" OR auth.uid()::text = "user2Id");`);
    await prisma.$executeRawUnsafe(`CREATE POLICY "Users can insert friendships" ON "Friendship" FOR INSERT WITH CHECK (auth.uid()::text = "user1Id" OR auth.uid()::text = "user2Id");`);
    await prisma.$executeRawUnsafe(`CREATE POLICY "Users can delete friendships" ON "Friendship" FOR DELETE USING (auth.uid()::text = "user1Id" OR auth.uid()::text = "user2Id");`);

    console.log('Successfully applied missing RLS policies!');
  } catch (err) {
    console.error('Error applying RLS policies:', err.message);
  }
}

fixMissingRLS()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
