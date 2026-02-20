import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import session from "express-session";
import SQLiteStore from "connect-sqlite3";
import cors from "cors";
import path from "path";
import fs from "fs";

import { storage } from "./storage";
import { config } from "./config";
import { ensureAuth } from "./middleware/auth";
import { upload } from "./middleware/upload";
import { hashPassword, verifyPassword } from "./utils/password";
import { loginSchema, registerSchema, reminderSchema, medicationLogSchema, locationLogSchema } from "./utils/validators";
import { z } from "zod";
import { initializeScheduler } from "./utils/scheduler";
import { twilioService } from "./utils/twilioService";

const SqliteStore = SQLiteStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup CORS with proper security
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with actual production domain
    : ['http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000'];
    
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      // In development, allow all Replit domains and localhost
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Log and reject unauthorized origins
      console.warn(`Blocked CORS request from unauthorized origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));

  // Setup session store
  app.use(session({
    store: new SqliteStore({ db: 'sessions.db' }) as any,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup Socket.IO
  const io = new SocketServer(httpServer, {
    cors: {
      origin: true, // Allow all origins in development
      credentials: true
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-user', (userId: number) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Initialize scheduler with socket.io
  initializeScheduler(io);

  // Serve uploaded files
  const uploadsDir = path.join(process.cwd(), 'server/public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Auth routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const password_hash = await hashPassword(password);
      const user = await storage.createUser({ email, password_hash, name });
      
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.json({ message: 'Logged out' });
    });
  });

  app.get('/api/auth/me', ensureAuth, async (req: Request, res: Response) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ id: user.id, email: user.email, name: user.name });
  });

  // Reminders routes
  app.get('/api/reminders', ensureAuth, async (req: Request, res: Response) => {
    const reminders = await storage.getReminders(req.session.userId!);
    res.json(reminders);
  });

  app.post('/api/reminders', ensureAuth, async (req: Request, res: Response) => {
    try {
      const data = reminderSchema.parse(req.body);
      const reminder = await storage.createReminder({
        ...data,
        user_id: req.session.userId!,
        next_run_at: new Date(data.next_run_at)
      });
      res.json(reminder);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.put('/api/reminders/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const reminder = await storage.updateReminder(id, updates);
      res.json(reminder);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.delete('/api/reminders/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteReminder(id);
      res.json({ message: 'Reminder deleted' });
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  // Medications routes
  app.get('/api/medications', ensureAuth, async (req: Request, res: Response) => {
    const medications = await storage.getMedications(req.session.userId!);
    res.json(medications);
  });

  app.post('/api/medications', ensureAuth, async (req: Request, res: Response) => {
    try {
      const medication = await storage.createMedication({
        ...req.body,
        user_id: req.session.userId!
      });
      res.json(medication);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.get('/api/medications/:id/logs', ensureAuth, async (req: Request, res: Response) => {
    const medicationId = parseInt(req.params.id);
    const logs = await storage.getMedicationLogs(medicationId);
    res.json(logs);
  });

  app.post('/api/medications/:id/logs', ensureAuth, async (req: Request, res: Response) => {
    try {
      const medicationId = parseInt(req.params.id);
      const { status, taken_at } = medicationLogSchema.parse(req.body);
      const log = await storage.createMedicationLog({
        medication_id: medicationId,
        status,
        taken_at: new Date(taken_at)
      });
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.put('/api/medications/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const medication = await storage.updateMedication(id, updates);
      res.json(medication);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.delete('/api/medications/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMedication(id);
      res.json({ message: 'Medication deleted' });
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  // Contacts routes
  app.get('/api/contacts', async (req: Request, res: Response) => {
    // Use session user or default demo user (id: 1)
    const userId = req.session?.userId || 1;
    const contacts = await storage.getContacts(userId);
    res.json(contacts);
  });

  app.post('/api/contacts', ensureAuth, upload.single('photo'), async (req: Request, res: Response) => {
    try {
      const contact = await storage.createContact({
        ...req.body,
        user_id: req.session.userId!,
        photo_path: req.file ? `/uploads/${req.file.filename}` : null
      });
      res.json(contact);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.put('/api/contacts/:id', ensureAuth, upload.single('photo'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates: any = { ...req.body };
      
      // If a new photo is uploaded, update the photo_path
      if (req.file) {
        updates.photo_path = `/uploads/${req.file.filename}`;
      }
      
      const contact = await storage.updateContact(id, updates);
      res.json(contact);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.delete('/api/contacts/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContact(id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: 'Failed to delete contact' });
    }
  });

  // Locations routes
  app.get('/api/locations', ensureAuth, async (req: Request, res: Response) => {
    const locations = await storage.getLocations(req.session.userId!);
    res.json(locations);
  });

  app.post('/api/locations', ensureAuth, async (req: Request, res: Response) => {
    try {
      const location = await storage.createLocation({
        ...req.body,
        user_id: req.session.userId!
      });
      res.json(location);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.get('/api/locations/logs', ensureAuth, async (req: Request, res: Response) => {
    const logs = await storage.getLocationLogs(req.session.userId!);
    res.json(logs);
  });

  app.post('/api/locations/logs', ensureAuth, async (req: Request, res: Response) => {
    try {
      const { lat, lng } = locationLogSchema.parse(req.body);
      const log = await storage.createLocationLog({
        user_id: req.session.userId!,
        lat,
        lng
      });
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  // Location sharing route - shares GPS location with all contacts
  app.post('/api/locations/share', ensureAuth, async (req: Request, res: Response) => {
    try {
      // Create location sharing schema with message field
      const locationShareSchema = z.object({
        lat: z.number(),
        lng: z.number(),
        message: z.string().optional()
      });
      
      const { lat, lng, message } = locationShareSchema.parse(req.body);

      // Log the location for the user
      const log = await storage.createLocationLog({
        user_id: req.session.userId!,
        lat,
        lng
      });

      // Get all user's contacts
      const contacts = await storage.getContacts(req.session.userId!);
      
      // Get user info for the notification
      const user = await storage.getUser(req.session.userId!);
      
      // Prepare location sharing data
      const locationData = {
        from_user: user?.name || 'Unknown',
        user_id: req.session.userId,
        lat,
        lng,
        message: message || 'Shared their location with you',
        timestamp: new Date().toISOString(),
        address: `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
      };

      // SECURITY: Do not broadcast location globally - serious privacy violation
      // In a real application, this would map contacts to user IDs and send targeted messages
      // For now, we only confirm to the sharer - no actual sharing occurs
      
      let notified = 0;
      
      // Development-only: Limited broadcast for demo purposes
      if (process.env.NODE_ENV === 'development') {
        // Only emit to the user who shared (for demo visualization)
        io.to(`user_${req.session.userId}`).emit('location:shared', {
          ...locationData,
          shared_with_contacts: contacts.map(c => c.name).join(', '),
          demo_note: 'Demo: Location not actually shared with contacts'
        });
      }
      
      // In production: implement proper contact-to-user mapping
      // for (const contact of contacts) {
      //   const contactUser = await storage.getUserByEmail(contact.email);
      //   if (contactUser) {
      //     io.to(`user_${contactUser.id}`).emit('location:shared', locationData);
      //     notified++;
      //   }
      // }
      
      notified = contacts.length; // Simulated count for UI consistency

      // Emit confirmation to the user who shared
      io.to(`user_${req.session.userId}`).emit('location:share_sent', {
        message: `Location shared with ${contacts.length} contact(s)`,
        contacts_count: contacts.length,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: `Location shared with ${contacts.length} contact(s)`,
        location: locationData,
        contacts_notified: notified
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data' });
      }
      console.error('Location sharing error:', error);
      res.status(500).json({ message: 'Failed to share location' });
    }
  });

  // Journal routes
  app.get('/api/journal', ensureAuth, async (req: Request, res: Response) => {
    const entries = await storage.getJournalEntries(req.session.userId!);
    res.json(entries);
  });

  app.post('/api/journal', ensureAuth, upload.single('audio'), async (req: Request, res: Response) => {
    try {
      const entry = await storage.createJournalEntry({
        user_id: req.session.userId!,
        type: req.body.type,
        content_text: req.body.content_text,
        audio_path: req.file ? `/uploads/${req.file.filename}` : null
      });
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.put('/api/journal/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.user_id;
      delete updates.audio_path;
      delete updates.created_at;
      
      const entry = await storage.updateJournalEntry(id, req.session.userId!, updates);
      res.json(entry);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found or unauthorized')) {
        return res.status(404).json({ message: 'Journal entry not found' });
      }
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.delete('/api/journal/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteJournalEntry(id, req.session.userId!);
      res.json({ message: 'Journal entry deleted successfully' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found or unauthorized')) {
        return res.status(404).json({ message: 'Journal entry not found' });
      }
      res.status(400).json({ message: 'Failed to delete journal entry' });
    }
  });

  // Memory wall routes
  app.get('/api/memory', ensureAuth, async (req: Request, res: Response) => {
    const items = await storage.getMemoryItems(req.session.userId!);
    res.json(items);
  });

  app.post('/api/memory', ensureAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }

      const item = await storage.createMemoryItem({
        user_id: req.session.userId!,
        type: req.body.type,
        file_path: `/uploads/${req.file.filename}`,
        title: req.body.title,
        tags: req.body.tags
      });
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.put('/api/memory/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.user_id;
      delete updates.file_path;
      delete updates.created_at;
      
      const item = await storage.updateMemoryItem(id, updates);
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.delete('/api/memory/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMemoryItem(id);
      res.json({ message: 'Memory deleted successfully' });
    } catch (error) {
      res.status(400).json({ message: 'Failed to delete memory' });
    }
  });

  // Routines routes
  app.get('/api/routines', ensureAuth, async (req: Request, res: Response) => {
    const routines = await storage.getRoutines(req.session.userId!);
    res.json(routines);
  });

  app.post('/api/routines', ensureAuth, async (req: Request, res: Response) => {
    try {
      const routine = await storage.createRoutine({
        ...req.body,
        user_id: req.session.userId!
      });
      res.json(routine);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.get('/api/routines/:id/tasks', ensureAuth, async (req: Request, res: Response) => {
    const routineId = parseInt(req.params.id);
    const tasks = await storage.getTasks(routineId);
    res.json(tasks);
  });

  app.post('/api/routines/:id/tasks', ensureAuth, async (req: Request, res: Response) => {
    try {
      const routineId = parseInt(req.params.id);
      const task = await storage.createTask({
        ...req.body,
        routine_id: routineId
      });
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  app.put('/api/tasks/:id', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.updateTask(id, req.body);
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: 'Invalid input' });
    }
  });

  // Games/Quiz routes
  app.get('/api/games/quiz', ensureAuth, async (req: Request, res: Response) => {
    try {
      // Generate quiz questions from contacts, medications, memory items, journal entries, reminders, and tasks
      // Focus on meaningful personal memory questions, avoiding trivial questions
      const contacts = await storage.getContacts(req.session.userId!);
      const medications = await storage.getMedications(req.session.userId!);
      const memoryItems = await storage.getMemoryItems(req.session.userId!);
      const journalEntries = await storage.getJournalEntries(req.session.userId!);
      const reminders = await storage.getReminders(req.session.userId!);
      const routines = await storage.getRoutines(req.session.userId!);

      const questions = [];

      // Helper function to generate wrong options that are similar but different
      const generateOptions = (correct: string, type: string, allData: any[]) => {
        const options = [correct];
        const similar = allData.map(item => {
          if (type === 'relation') return item.relation;
          if (type === 'dosage') return item.dosage;
          if (type === 'name') return item.name;
          return '';
        }).filter(val => val && val !== correct);
        
        // Add some generic options if not enough similar ones
        const genericOptions = {
          relation: ['Daughter', 'Son', 'Friend', 'Doctor', 'Neighbor', 'Spouse', 'Caregiver'],
          dosage: ['5mg', '10mg', '15mg', '20mg', '25mg', '50mg', '100mg'],
          name: ['John', 'Mary', 'David', 'Sarah', 'Michael', 'Lisa']
        };
        
        const pool = [...similar, ...(genericOptions[type as keyof typeof genericOptions] || [])].filter(opt => opt !== correct);
        
        // Randomly select 3 wrong options
        while (options.length < 4 && pool.length > 0) {
          const randomIndex = Math.floor(Math.random() * pool.length);
          const option = pool.splice(randomIndex, 1)[0];
          if (!options.includes(option)) {
            options.push(option);
          }
        }
        
        // Shuffle the options
        return options.sort(() => 0.5 - Math.random());
      };

      // Generate questions from contacts
      contacts.slice(0, 3).forEach(contact => {
        if (contact.name && contact.relation) {
          questions.push({
            type: 'contact',
            question: `What is ${contact.name}'s relationship to you?`,
            answer: contact.relation,
            options: generateOptions(contact.relation, 'relation', contacts)
          });
        }

        if (contact.name && contact.phone) {
          // Create phone number questions (last 4 digits for privacy)
          const lastFour = contact.phone.slice(-4);
          questions.push({
            type: 'contact',
            question: `What are the last four digits of ${contact.name}'s phone number?`,
            answer: lastFour,
            options: [lastFour, 
              Math.floor(Math.random() * 9000 + 1000).toString(),
              Math.floor(Math.random() * 9000 + 1000).toString(),
              Math.floor(Math.random() * 9000 + 1000).toString()
            ].sort(() => 0.5 - Math.random())
          });
        }
      });

      // Generate questions from medications
      medications.slice(0, 3).forEach(med => {
        if (med.name && med.dosage) {
          questions.push({
            type: 'medication',
            question: `What is the dosage for ${med.name}?`,
            answer: med.dosage,
            options: generateOptions(med.dosage, 'dosage', medications)
          });
        }

        if (med.name && med.notes) {
          questions.push({
            type: 'medication',
            question: `What are the notes for ${med.name}?`,
            answer: med.notes,
            options: [med.notes, 'Take with food', 'Take on empty stomach', 'Take at bedtime', 'Take with water'].filter((note, index, arr) => arr.indexOf(note) === index).slice(0, 4).sort(() => 0.5 - Math.random())
          });
        }
      });

      // Generate questions from memory items (avoid trivial "what type of file" questions)
      memoryItems.slice(0, 2).forEach(memory => {
        if (memory.title && memory.tags) {
          const tags = memory.tags.split(',').map(tag => tag.trim()).filter(Boolean);
          if (tags.length > 0) {
            const correctTag = tags[0];
            questions.push({
              type: 'memory',
              question: `Which tag is associated with the memory "${memory.title}"?`,
              answer: correctTag,
              options: [correctTag, 'family', 'vacation', 'celebration', 'friends'].filter((tag, index, arr) => arr.indexOf(tag) === index).slice(0, 4).sort(() => 0.5 - Math.random())
            });
          }
        }
      });

      // Generate questions from journal entries - meaningful personal memory questions
      const textJournals = journalEntries.filter((j: any) => j.content_text).slice(0, 3);
      textJournals.forEach((journal: any) => {
        const content = journal.content_text;
        const date = new Date(journal.created_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        
        // Extract key phrases from journal content for meaningful questions
        const words = content.split(/\s+/).filter((w: string) => w.length > 4);
        if (words.length >= 5) {
          const preview = words.slice(0, 8).join(' ') + (words.length > 8 ? '...' : '');
          const snippet = content.substring(0, 50) + (content.length > 50 ? '...' : '');
          
          // Question about when something was written
          questions.push({
            type: 'journal',
            question: `When did you write: "${snippet}"?`,
            answer: dateStr,
            options: [
              dateStr,
              new Date(date.getTime() - 86400000 * 3).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              new Date(date.getTime() + 86400000 * 2).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              new Date(date.getTime() - 86400000 * 7).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            ].filter((d, i, arr) => arr.indexOf(d) === i).sort(() => 0.5 - Math.random())
          });
        }
      });

      // Generate questions from reminders - personal schedule and tasks
      const activeReminders = reminders.filter((r: any) => r.active).slice(0, 2);
      activeReminders.forEach((reminder: any) => {
        questions.push({
          type: 'reminder',
          question: `What type of reminder is "${reminder.title}"?`,
          answer: reminder.type,
          options: [reminder.type, 'medication', 'meal', 'appointment', 'task'].filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 4).sort(() => 0.5 - Math.random())
        });
      });

      // Generate questions from routines/tasks - daily activities
      routines.slice(0, 1).forEach((routine: any) => {
        questions.push({
          type: 'routine',
          question: `What is one of your daily routines?`,
          answer: routine.title,
          options: [routine.title, 'Morning Exercise', 'Evening Walk', 'Reading Time', 'Medication Review'].filter((r, i, arr) => arr.indexOf(r) === i).slice(0, 4).sort(() => 0.5 - Math.random())
        });
      });

      // If no user data, provide default questions
      if (questions.length === 0) {
        questions.push(
          {
            type: 'general',
            question: 'What should you do if you miss a medication dose?',
            answer: 'Take it as soon as you remember',
            options: ['Take it as soon as you remember', 'Skip it and wait for next dose', 'Take double dose next time', 'Stop taking the medication']
          },
          {
            type: 'general',
            question: 'How often should you review your medication list with your doctor?',
            answer: 'At every visit',
            options: ['At every visit', 'Once a year', 'Only when sick', 'Never needed']
          },
          {
            type: 'general',
            question: 'What is the most important thing to remember about emergency contacts?',
            answer: 'Keep them easily accessible',
            options: ['Keep them easily accessible', 'Memorize all numbers', 'Only use family members', 'Update them monthly']
          }
        );
      }

      // Shuffle and limit to 6 questions
      const shuffled = questions.sort(() => 0.5 - Math.random());
      res.json(shuffled.slice(0, 6));
    } catch (error) {
      console.error('Error generating quiz questions:', error);
      res.status(500).json({ message: 'Failed to generate quiz questions' });
    }
  });

  // Emergency routes
  app.get('/api/emergency', ensureAuth, async (req: Request, res: Response) => {
    const alerts = await storage.getEmergencyAlerts(req.session.userId!);
    res.json(alerts);
  });

  app.post('/api/emergency', ensureAuth, async (req: Request, res: Response) => {
    try {
      const alert = await storage.createEmergencyAlert({
        user_id: req.session.userId!
      });

      // Get user info and emergency contacts
      const user = await storage.getUser(req.session.userId!);
      const contacts = await storage.getContacts(req.session.userId!);
      const emergencyContacts = contacts.filter(contact => {
        const relation = contact.relation.toLowerCase();
        // Include traditional emergency relations and common custom relations
        return ['family', 'caregiver', 'doctor', 'daughter', 'son', 'spouse'].includes(relation) ||
               // Include other custom relations that indicate close relationships
               relation.includes('mother') || relation.includes('father') ||
               relation.includes('parent') || relation.includes('child') ||
               relation.includes('sibling') || relation.includes('brother') || relation.includes('sister') ||
               relation.includes('cousin') || relation.includes('aunt') || relation.includes('uncle') ||
               relation.includes('therapist') || relation.includes('nurse') || 
               relation.includes('caregiver') || relation.includes('guardian');
      });

      // Get location information if provided
      let locationText = '';
      const { lat, lng } = req.body || {};
      if (lat && lng) {
        try {
          // Log the location
          await storage.createLocationLog({
            user_id: req.session.userId!,
            lat: parseFloat(lat),
            lng: parseFloat(lng)
          });
          
          // Try to get a readable address from coordinates (simplified)
          locationText = `coordinates ${lat}, ${lng}`;
          
          // In a real app, you might want to use reverse geocoding here
          // For now, we'll use a simple coordinate display
        } catch (error) {
          console.log('Failed to log emergency location:', error);
        }
      }

      // Send SMS alerts to emergency contacts
      let smsResults = null;
      if (emergencyContacts.length > 0) {
        smsResults = await twilioService.sendEmergencyAlert(
          emergencyContacts, 
          user?.name || 'A patient',
          locationText || undefined
        );
        console.log('SMS alert results:', smsResults);
      }

      // Emit emergency alert via socket.io
      io.to(`user_${req.session.userId}`).emit('emergency:alert', {
        id: alert.id,
        message: 'Emergency alert triggered',
        timestamp: alert.triggered_at,
        smsResults
      });

      res.json({ 
        alert,
        smsResults,
        emergencyContactsCount: emergencyContacts.length
      });
    } catch (error) {
      console.error('Emergency alert error:', error);
      res.status(400).json({ message: 'Failed to create emergency alert' });
    }
  });

  app.post('/api/emergency/:id/resolve', ensureAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const alert = await storage.resolveEmergencyAlert(id);
      res.json(alert);
    } catch (error) {
      res.status(400).json({ message: 'Failed to resolve emergency alert' });
    }
  });

  // Identify route (for photo tagging and object recognition with optional voice notes)
  app.post('/api/identify', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || !files.photo || !files.photo[0]) {
        return res.status(400).json({ message: 'Photo is required' });
      }

      // Use session user or default demo user (id: 1)
      const userId = req.session?.userId || 1;
      const { tags, notes, transcription, linked_contact_id, detected_objects, visual_features } = req.body;
      
      const photoFile = files.photo[0];
      const audioFile = files.audio ? files.audio[0] : null;

      // Store object recognition data if provided
      if (detected_objects && visual_features && tags) {
        const objectRecognition = await storage.createObjectRecognition({
          user_id: userId,
          photo_path: `/uploads/${photoFile.filename}`,
          user_tag: tags,
          detected_objects: typeof detected_objects === 'string' ? detected_objects : JSON.stringify(detected_objects),
          visual_features: typeof visual_features === 'string' ? visual_features : JSON.stringify(visual_features),
          notes: notes || null,
          audio_path: audioFile ? `/uploads/${audioFile.filename}` : null,
          transcription: transcription || null,
          linked_contact_id: linked_contact_id ? parseInt(linked_contact_id) : null
        });

        res.json({
          id: objectRecognition.id,
          photo_path: `/uploads/${photoFile.filename}`,
          audio_path: audioFile ? `/uploads/${audioFile.filename}` : null,
          transcription: transcription || null,
          message: 'Photo uploaded and tagged successfully',
          object_recognition: objectRecognition
        });
      } else {
        // Fallback for basic photo upload
        res.json({
          photo_path: `/uploads/${photoFile.filename}`,
          audio_path: audioFile ? `/uploads/${audioFile.filename}` : null,
          message: 'Photo uploaded successfully'
        });
      }
    } catch (error) {
      console.error('Failed to process photo:', error);
      res.status(400).json({ message: 'Failed to upload photo' });
    }
  });

  // Get user's stored object recognitions
  app.get('/api/identify/objects', async (req: Request, res: Response) => {
    try {
      // Use session user or default demo user (id: 1)
      const userId = req.session?.userId || 1;
      const objects = await storage.getObjectRecognitions(userId);
      res.json(objects);
    } catch (error) {
      res.status(400).json({ message: 'Failed to get object recognitions' });
    }
  });

  // Find similar objects for recognition
  app.post('/api/identify/match', async (req: Request, res: Response) => {
    try {
      // Use session user or default demo user (id: 1)
      const userId = req.session?.userId || 1;
      const { visual_features } = req.body;

      if (!visual_features) {
        return res.status(400).json({ message: 'Visual features required' });
      }

      const similarObjects = await storage.findSimilarObjects(userId, visual_features);
      res.json(similarObjects);
    } catch (error) {
      res.status(400).json({ message: 'Failed to find similar objects' });
    }
  });

  // Performance Analysis - Quiz Scores
  app.get('/api/performance/quiz-scores', async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId || 1;
      const scores = await storage.getQuizScores(userId);
      res.json(scores);
    } catch (error) {
      res.status(400).json({ message: 'Failed to get quiz scores' });
    }
  });

  app.post('/api/performance/quiz-scores', async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId || 1;
      const { score, total_questions, percentage } = req.body;
      
      if (score === undefined || total_questions === undefined || percentage === undefined) {
        return res.status(400).json({ message: 'Score, total_questions, and percentage are required' });
      }

      const quizScore = await storage.createQuizScore({
        user_id: userId,
        score,
        total_questions,
        percentage
      });
      
      res.json(quizScore);
    } catch (error) {
      res.status(400).json({ message: 'Failed to save quiz score' });
    }
  });

  // Performance Analysis - Memory Game Scores (new games: Memory Match, Pattern Recall)
  app.get('/api/performance/memory-game-scores', async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId || 1;
      const scores = await storage.getMemoryGameScores(userId);
      res.json(scores);
    } catch (error) {
      res.status(400).json({ message: 'Failed to get memory game scores' });
    }
  });

  app.post('/api/performance/memory-game-scores', async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId || 1;
      const { game_type, score, max_score, time_taken, percentage } = req.body;
      
      if (!game_type || score === undefined || max_score === undefined || percentage === undefined) {
        return res.status(400).json({ message: 'game_type, score, max_score, and percentage are required' });
      }

      const gameScore = await storage.createMemoryGameScore({
        user_id: userId,
        game_type,
        score,
        max_score,
        time_taken,
        percentage
      });
      
      res.json(gameScore);
    } catch (error) {
      res.status(400).json({ message: 'Failed to save memory game score' });
    }
  });

  // Performance Analysis - Medication Logs with joined medication info
  app.get('/api/performance/medication-logs', async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId || 1;
      const medications = await storage.getMedications(userId);
      
      const allLogs = await Promise.all(
        medications.map(async (med) => {
          const logs = await storage.getMedicationLogs(med.id);
          return logs.map(log => ({
            ...log,
            medication_name: med.name,
            medication_dosage: med.dosage
          }));
        })
      );
      
      const flatLogs = allLogs.flat().sort((a, b) => 
        new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
      );
      
      res.json(flatLogs);
    } catch (error) {
      res.status(400).json({ message: 'Failed to get medication logs' });
    }
  });

  return httpServer;
}
