const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing Database Schema...');
  
  // 1. Create a dummy user
  const user1 = await prisma.user.create({
    data: {
      email: 'test1_' + Date.now() + '@test.com',
      name: 'Test User 1',
    }
  });
  
  const user2 = await prisma.user.create({
    data: {
      email: 'test2_' + Date.now() + '@test.com',
      name: 'Test User 2',
    }
  });
  
  console.log('Users created:', user1.id, user2.id);

  // 2. Test Following (Friendship)
  const follow = await prisma.friendship.create({
    data: {
      user1Id: user1.id,
      user2Id: user2.id,
    }
  });
  console.log('Follow system working! ID:', follow.id);
  
  // 3. Test Group Creation
  const group = await prisma.group.create({
    data: {
      name: 'Test Group',
      description: 'A test group for real-time tracking',
      createdById: user1.id,
    }
  });
  console.log('Group creation working! ID:', group.id);

  // 4. Test HealthMetric (Dashboard Tracking)
  const metric = await prisma.healthMetric.create({
    data: {
      userId: user1.id,
      type: 'Hydration',
      value: 250,
      unit: 'ml'
    }
  });
  console.log('Health metric logged successfully! ID:', metric.id);

  // 5. Test Activity (Real-time posts)
  const post = await prisma.activity.create({
    data: {
      userId: user1.id,
      userName: user1.name,
      activity: 'Test Workout',
      metrics: '5km in 25min',
      comments: [],
      reactions: {}
    }
  });
  console.log('Post creation working! ID:', post.id);
  
  // Clean up
  await prisma.activity.delete({ where: { id: post.id } });
  await prisma.healthMetric.delete({ where: { id: metric.id } });
  await prisma.group.delete({ where: { id: group.id } });
  await prisma.friendship.delete({ where: { id: follow.id } });
  await prisma.user.delete({ where: { id: user1.id } });
  await prisma.user.delete({ where: { id: user2.id } });
  
  console.log('All tests passed and cleaned up!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
