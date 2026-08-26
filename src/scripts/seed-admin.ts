import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminService } from '../modules/admin/admin.service';

async function seed() {
  console.log('🌱 Starting admin seeding process...');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const adminService = app.get(AdminService);
    const result = await adminService.seedSuperadmin();

    if (result.seeded) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`ℹ️ ${result.message}`);
    }
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    await app.close();
    process.exit(1);
  }

  await app.close();
  console.log('🏁 Admin seeding completed.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Fatal error during seed execution:', err);
  process.exit(1);
});
