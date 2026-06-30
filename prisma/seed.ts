import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding data...')

  // 1. Gym Programs
  const gymPrograms = [
    {
      title: 'Full Body HIIT',
      difficulty: 'Intermediate',
      duration: '45 mins',
      workouts: 4,
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
    },
    {
      title: 'Strength Core',
      difficulty: 'Advanced',
      duration: '60 mins',
      workouts: 5,
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    },
    {
      title: 'Beginner Yoga',
      difficulty: 'Beginner',
      duration: '30 mins',
      workouts: 2,
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    },
    {
      title: 'Marathon Prep',
      difficulty: 'Advanced',
      duration: '90 mins',
      workouts: 6,
      image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
    }
  ];

  for (const program of gymPrograms) {
    await prisma.gymProgram.create({ data: program });
  }

  // 2. Products
  const products = [
    {
      name: 'Pro Performance Protein',
      price: 49.99,
      category: 'supplements',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80',
    },
    {
      name: 'Elite Lifting Belt',
      price: 34.99,
      category: 'equipment',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1584863265045-de752a4a7cc6?w=800&q=80',
    },
    {
      name: 'Recovery BCAAs',
      price: 29.99,
      category: 'supplements',
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=800&q=80',
    },
    {
      name: 'AeroFlex Running Tee',
      price: 39.99,
      category: 'apparel',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    },
    {
      name: 'Adjustable Dumbbells Set',
      price: 199.99,
      category: 'equipment',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',
    },
    {
      name: 'Compression Tights',
      price: 45.00,
      category: 'apparel',
      rating: 4.5,
      image: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=800&q=80',
    }
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  
  // 3. Dummy User & Activity (for community feed)
  // Check if dummy user exists
  const existingUser = await prisma.user.findFirst({ where: { email: 'test@example.com' } });
  let userId = existingUser?.id;
  
  if (!userId) {
     const user = await prisma.user.create({
       data: {
         id: "99999999-9999-9999-9999-999999999999", // Ensure UUID format
         email: 'test@example.com',
         name: 'Sarah Jenkins',
         avatar: 'https://i.pravatar.cc/150?u=sarah',
       }
     });
     userId = user.id;
  }
  
  await prisma.activity.create({
    data: {
      userId: userId,
      userName: 'Sarah Jenkins',
      activity: 'Morning Run',
      metrics: '5.2 km in 28:45',
      likes: 12,
      likedBy: [],
      comments: [
        { id: 1, user: "Alex M.", text: "Great pace!", time: "1h ago" }
      ],
      reactions: {},
      mediaUrls: ['https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80'],
      storyText: 'Felt great this morning! Beautiful sunrise on the trail.',
    }
  });

  await prisma.activity.create({
    data: {
      userId: userId,
      userName: 'Sarah Jenkins',
      activity: 'Heavy Leg Day',
      metrics: 'Squat PB: 120kg',
      likes: 8,
      likedBy: [],
      comments: [],
      reactions: {},
      mediaUrls: [],
      storyText: 'Finally hit my squat PR!',
    }
  });

  console.log('Seeding completed!')
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
