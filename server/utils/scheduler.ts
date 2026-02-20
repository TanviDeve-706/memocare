import cron from 'node-cron';
import { db } from '../db';
import { reminders } from '@shared/schema';
import { eq, and, lte } from 'drizzle-orm';
import { Server } from 'socket.io';

let io: Server;

// Calculate next run time based on cron expression
function calculateNextRun(scheduleCron: string, currentTime: Date): Date {
  const nextRun = new Date(currentTime);
  
  switch (scheduleCron) {
    case '0 * * * *': // Hourly
      nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0);
      break;
    case '0 9 * * *': // Daily at 9:00 AM
      nextRun.setHours(9, 0, 0, 0);
      if (nextRun <= currentTime) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case '0 9 * * 1': // Weekly on Monday at 9:00 AM
      nextRun.setHours(9, 0, 0, 0);
      const dayOfWeek = nextRun.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
      if (dayOfWeek === 1 && nextRun <= currentTime) {
        // If it's Monday but past 9 AM, schedule for next Monday
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (dayOfWeek !== 1) {
        // If it's not Monday, schedule for next Monday
        nextRun.setDate(nextRun.getDate() + daysUntilMonday);
      }
      break;
    default:
      // Fallback to daily
      nextRun.setDate(nextRun.getDate() + 1);
      break;
  }
  
  return nextRun;
}

export function initializeScheduler(socketServer: Server) {
  io = socketServer;
  
  console.log('✅ Scheduler initialized - checking for reminders every minute');
  
  // Check for due reminders every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      console.log(`[Scheduler] Checking reminders at ${now.toISOString()}`);
      
      const dueReminders = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.active, true),
            lte(reminders.next_run_at, now)
          )
        );

      if (dueReminders.length > 0) {
        console.log(`[Scheduler] Found ${dueReminders.length} due reminder(s)`);
      }

      for (const reminder of dueReminders) {
        // Emit reminder via socket.io to all connected clients in the user's room
        const emitted = io.to(`user_${reminder.user_id}`).emit('reminder:due', {
          id: reminder.id,
          title: reminder.title,
          type: reminder.type,
        });

        console.log(`[Scheduler] ✅ Reminder fired: "${reminder.title}" for user ${reminder.user_id} at ${now.toISOString()}`);

        // Handle next run time based on schedule type
        if (reminder.schedule_cron === 'once' || reminder.schedule_cron === 'custom') {
          // One-time reminder - deactivate it
          await db
            .update(reminders)
            .set({ active: false })
            .where(eq(reminders.id, reminder.id));
          console.log(`[Scheduler] Deactivated one-time reminder: ${reminder.title}`);
        } else {
          // Recurring reminder - calculate next run time
          const nextRun = calculateNextRun(reminder.schedule_cron, now);
          await db
            .update(reminders)
            .set({ next_run_at: nextRun })
            .where(eq(reminders.id, reminder.id));
          console.log(`[Scheduler] Updated recurring reminder: ${reminder.title}, next run: ${nextRun.toISOString()}`);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error:', error);
    }
  });
}
