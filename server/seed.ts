import { db } from './db';
import { users, medications, contacts, reminders, memory_items } from '@shared/schema';
import { hashPassword } from './utils/password';

async function seed() {
  console.log('Seeding database...');

  // Create demo user
  const passwordHash = await hashPassword('demo123');
  const [user] = await db.insert(users).values({
    email: 'demo@memocare.local',
    password_hash: passwordHash,
    name: 'John Smith'
  }).returning();

  console.log('Created demo user:', user.email);

  // Create demo medication
  await db.insert(medications).values({
    user_id: user.id,
    name: 'Aricept',
    dosage: '10mg',
    notes: 'Take with breakfast'
  });

  // Create demo contacts
  await db.insert(contacts).values([
    {
      user_id: user.id,
      name: 'Sarah Miller',
      relation: 'Daughter',
      phone: '(555) 123-4567',
      email: 'sarah@email.com'
    },
    {
      user_id: user.id,
      name: 'Dr. Johnson',
      relation: 'Doctor',
      phone: '(555) 987-6543',
      email: 'dr.johnson@clinic.com'
    }
  ]);

  // Create demo reminder (every minute for testing)
  await db.insert(reminders).values({
    user_id: user.id,
    title: 'Take morning medication',
    type: 'medication',
    schedule_cron: '* * * * *', // Every minute for demo
    next_run_at: new Date(),
    active: true
  });

  // Create demo memory items
  await db.insert(memory_items).values([
    {
      user_id: user.id,
      type: 'photo',
      file_path: '/demo/family-dinner.jpg',
      title: 'Family Dinner',
      tags: 'family,celebration'
    },
    {
      user_id: user.id,
      type: 'photo',
      file_path: '/demo/garden.jpg',
      title: 'Spring Garden',
      tags: 'garden,flowers'
    }
  ]);

  console.log('Database seeded successfully!');
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch(console.error);
}

export { seed };
