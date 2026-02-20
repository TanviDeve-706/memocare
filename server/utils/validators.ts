import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

export const reminderSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['medication', 'meal', 'appointment', 'task']),
  schedule_cron: z.string().min(1),
  next_run_at: z.string().datetime(),
});

export const medicationLogSchema = z.object({
  status: z.enum(['taken', 'missed']),
  taken_at: z.string().datetime(),
});

export const locationLogSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
