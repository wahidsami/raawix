import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const adminEmail = 'admin@local';
  const adminPassword = 'admin123'; // Dev only - change in production!
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
  } else {
    const admin = await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'admin',
      },
    });
    console.log(`✅ Created admin user: ${admin.email}`);
    console.log(`   Password: ${adminPassword} (dev only - change in production!)`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

