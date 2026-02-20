import { db } from './db';
import { 
  users, reminders, medications, medication_logs, contacts, locations, location_logs,
  journal_entries, memory_items, routines, tasks, quiz_questions, quiz_scores, memory_game_scores, emergency_alerts,
  object_recognitions, object_matches,
  type User, type NewUser, type Reminder, type NewReminder,
  type Medication, type NewMedication, type MedicationLog, type NewMedicationLog,
  type Contact, type NewContact, type Location, type NewLocation,
  type LocationLog, type NewLocationLog, type JournalEntry, type NewJournalEntry,
  type MemoryItem, type NewMemoryItem, type Routine, type NewRoutine,
  type Task, type NewTask, type QuizQuestion, type NewQuizQuestion,
  type QuizScore, type NewQuizScore, type MemoryGameScore, type NewMemoryGameScore,
  type EmergencyAlert, type NewEmergencyAlert,
  type ObjectRecognition, type NewObjectRecognition,
  type ObjectMatch, type NewObjectMatch
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: NewUser): Promise<User>;

  // Reminders
  getReminders(userId: number): Promise<Reminder[]>;
  getReminderById(id: number): Promise<Reminder | undefined>;
  createReminder(reminder: NewReminder): Promise<Reminder>;
  updateReminder(id: number, updates: Partial<NewReminder>): Promise<Reminder>;
  deleteReminder(id: number): Promise<void>;

  // Medications
  getMedications(userId: number): Promise<Medication[]>;
  getMedicationById(id: number): Promise<Medication | undefined>;
  createMedication(medication: NewMedication): Promise<Medication>;
  updateMedication(id: number, updates: Partial<NewMedication>): Promise<Medication>;
  deleteMedication(id: number): Promise<void>;

  // Medication Logs
  getMedicationLogs(medicationId: number): Promise<MedicationLog[]>;
  createMedicationLog(log: NewMedicationLog): Promise<MedicationLog>;

  // Contacts
  getContacts(userId: number): Promise<Contact[]>;
  getContactById(id: number): Promise<Contact | undefined>;
  createContact(contact: NewContact): Promise<Contact>;
  updateContact(id: number, updates: Partial<NewContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;

  // Locations
  getLocations(userId: number): Promise<Location[]>;
  createLocation(location: NewLocation): Promise<Location>;
  getLocationLogs(userId: number): Promise<LocationLog[]>;
  createLocationLog(log: NewLocationLog): Promise<LocationLog>;

  // Journal
  getJournalEntries(userId: number): Promise<JournalEntry[]>;
  createJournalEntry(entry: NewJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, userId: number, updates: Partial<JournalEntry>): Promise<JournalEntry>;
  deleteJournalEntry(id: number, userId: number): Promise<void>;

  // Memory Items
  getMemoryItems(userId: number): Promise<MemoryItem[]>;
  createMemoryItem(item: NewMemoryItem): Promise<MemoryItem>;
  updateMemoryItem(id: number, updates: Partial<MemoryItem>): Promise<MemoryItem>;
  deleteMemoryItem(id: number): Promise<void>;

  // Routines & Tasks
  getRoutines(userId: number): Promise<Routine[]>;
  createRoutine(routine: NewRoutine): Promise<Routine>;
  getTasks(routineId: number): Promise<Task[]>;
  createTask(task: NewTask): Promise<Task>;
  updateTask(id: number, updates: Partial<NewTask>): Promise<Task>;

  // Quiz
  getQuizQuestions(userId: number): Promise<QuizQuestion[]>;
  createQuizQuestion(question: NewQuizQuestion): Promise<QuizQuestion>;
  
  // Quiz Scores (Performance)
  getQuizScores(userId: number): Promise<QuizScore[]>;
  createQuizScore(score: NewQuizScore): Promise<QuizScore>;
  
  // Memory Game Scores (Performance)
  getMemoryGameScores(userId: number): Promise<MemoryGameScore[]>;
  createMemoryGameScore(score: NewMemoryGameScore): Promise<MemoryGameScore>;

  // Emergency
  getEmergencyAlerts(userId: number): Promise<EmergencyAlert[]>;
  createEmergencyAlert(alert: NewEmergencyAlert): Promise<EmergencyAlert>;
  resolveEmergencyAlert(id: number): Promise<EmergencyAlert>;

  // Object Recognition
  getObjectRecognitions(userId: number): Promise<ObjectRecognition[]>;
  createObjectRecognition(recognition: NewObjectRecognition): Promise<ObjectRecognition>;
  findSimilarObjects(userId: number, visualFeatures: string): Promise<ObjectRecognition[]>;
  createObjectMatch(match: NewObjectMatch): Promise<ObjectMatch>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
//ts asynchronous function used to fetch one specific user from db
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: NewUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getReminders(userId: number): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.user_id, userId));
  }

  async getReminderById(id: number): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder;
  }

  async createReminder(reminder: NewReminder): Promise<Reminder> {
    const [created] = await db.insert(reminders).values(reminder).returning();
    return created;
  }

  async updateReminder(id: number, updates: Partial<NewReminder>): Promise<Reminder> {
    const [updated] = await db.update(reminders).set(updates).where(eq(reminders.id, id)).returning();
    return updated;
  }

  async deleteReminder(id: number): Promise<void> {
    await db.delete(reminders).where(eq(reminders.id, id));
  }

  async getMedications(userId: number): Promise<Medication[]> {
    return db.select().from(medications).where(eq(medications.user_id, userId));
  }

  async getMedicationById(id: number): Promise<Medication | undefined> {
    const [medication] = await db.select().from(medications).where(eq(medications.id, id));
    return medication;
  }

  async createMedication(medication: NewMedication): Promise<Medication> {
    const [created] = await db.insert(medications).values(medication).returning();
    return created;
  }

  async updateMedication(id: number, updates: Partial<NewMedication>): Promise<Medication> {
    const [updated] = await db.update(medications).set(updates).where(eq(medications.id, id)).returning();
    return updated;
  }

  async deleteMedication(id: number): Promise<void> {
    await db.delete(medications).where(eq(medications.id, id));
  }

  async getMedicationLogs(medicationId: number): Promise<MedicationLog[]> {
    return db.select().from(medication_logs).where(eq(medication_logs.medication_id, medicationId)).orderBy(desc(medication_logs.taken_at));
  }

  async createMedicationLog(log: NewMedicationLog): Promise<MedicationLog> {
    const [created] = await db.insert(medication_logs).values(log).returning();
    return created;
  }

  async getContacts(userId: number): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.user_id, userId));
  }

  async getContactById(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: NewContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  async updateContact(id: number, updates: Partial<NewContact>): Promise<Contact> {
    const [updated] = await db.update(contacts).set(updates).where(eq(contacts.id, id)).returning();
    return updated;
  }

  async deleteContact(id: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  async getLocations(userId: number): Promise<Location[]> {
    return db.select().from(locations).where(eq(locations.user_id, userId));
  }

  async createLocation(location: NewLocation): Promise<Location> {
    const [created] = await db.insert(locations).values(location).returning();
    return created;
  }

  async getLocationLogs(userId: number): Promise<LocationLog[]> {
    return db.select().from(location_logs).where(eq(location_logs.user_id, userId)).orderBy(desc(location_logs.recorded_at));
  }

  async createLocationLog(log: NewLocationLog): Promise<LocationLog> {
    const [created] = await db.insert(location_logs).values(log).returning();
    return created;
  }

  async getJournalEntries(userId: number): Promise<JournalEntry[]> {
    return db.select().from(journal_entries).where(eq(journal_entries.user_id, userId)).orderBy(desc(journal_entries.created_at));
  }

  async createJournalEntry(entry: NewJournalEntry): Promise<JournalEntry> {
    const [created] = await db.insert(journal_entries).values(entry).returning();
    return created;
  }

  async updateJournalEntry(id: number, userId: number, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    const [updated] = await db.update(journal_entries).set(updates).where(and(eq(journal_entries.id, id), eq(journal_entries.user_id, userId))).returning();
    if (!updated) {
      throw new Error('Journal entry not found or unauthorized');
    }
    return updated;
  }

  async deleteJournalEntry(id: number, userId: number): Promise<void> {
    const result = await db.delete(journal_entries).where(and(eq(journal_entries.id, id), eq(journal_entries.user_id, userId))).returning();
    if (result.length === 0) {
      throw new Error('Journal entry not found or unauthorized');
    }
  }

  async getMemoryItems(userId: number): Promise<MemoryItem[]> {
    return db.select().from(memory_items).where(eq(memory_items.user_id, userId)).orderBy(desc(memory_items.created_at));
  }

  async createMemoryItem(item: NewMemoryItem): Promise<MemoryItem> {
    const [created] = await db.insert(memory_items).values(item).returning();
    return created;
  }

  async updateMemoryItem(id: number, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const [updated] = await db.update(memory_items).set(updates).where(eq(memory_items.id, id)).returning();
    return updated;
  }

  async deleteMemoryItem(id: number): Promise<void> {
    await db.delete(memory_items).where(eq(memory_items.id, id));
  }

  async getRoutines(userId: number): Promise<Routine[]> {
    return db.select().from(routines).where(eq(routines.user_id, userId));
  }

  async createRoutine(routine: NewRoutine): Promise<Routine> {
    const [created] = await db.insert(routines).values(routine).returning();
    return created;
  }

  async getTasks(routineId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.routine_id, routineId));
  }

  async createTask(task: NewTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, updates: Partial<NewTask>): Promise<Task> {
    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async getQuizQuestions(userId: number): Promise<QuizQuestion[]> {
    return db.select().from(quiz_questions).where(eq(quiz_questions.user_id, userId));
  }

  async createQuizQuestion(question: NewQuizQuestion): Promise<QuizQuestion> {
    const [created] = await db.insert(quiz_questions).values(question).returning();
    return created;
  }

  async getQuizScores(userId: number): Promise<QuizScore[]> {
    return db.select().from(quiz_scores).where(eq(quiz_scores.user_id, userId)).orderBy(desc(quiz_scores.completed_at));
  }

  async createQuizScore(score: NewQuizScore): Promise<QuizScore> {
    const [created] = await db.insert(quiz_scores).values(score).returning();
    return created;
  }

  async getMemoryGameScores(userId: number): Promise<MemoryGameScore[]> {
    return db.select().from(memory_game_scores).where(eq(memory_game_scores.user_id, userId)).orderBy(desc(memory_game_scores.completed_at));
  }

  async createMemoryGameScore(score: NewMemoryGameScore): Promise<MemoryGameScore> {
    const [created] = await db.insert(memory_game_scores).values(score).returning();
    return created;
  }

  async getEmergencyAlerts(userId: number): Promise<EmergencyAlert[]> {
    return db.select().from(emergency_alerts).where(eq(emergency_alerts.user_id, userId)).orderBy(desc(emergency_alerts.triggered_at));
  }

  async createEmergencyAlert(alert: NewEmergencyAlert): Promise<EmergencyAlert> {
    const [created] = await db.insert(emergency_alerts).values(alert).returning();
    return created;
  }

  async resolveEmergencyAlert(id: number): Promise<EmergencyAlert> {
    const [resolved] = await db.update(emergency_alerts).set({ 
      status: 'resolved',
      resolved_at: new Date()
    }).where(eq(emergency_alerts.id, id)).returning();
    return resolved;
  }

  // Object Recognition methods
  async getObjectRecognitions(userId: number): Promise<ObjectRecognition[]> {
    return db.select().from(object_recognitions).where(eq(object_recognitions.user_id, userId)).orderBy(desc(object_recognitions.created_at));
  }

  async createObjectRecognition(recognition: NewObjectRecognition): Promise<ObjectRecognition> {
    const [created] = await db.insert(object_recognitions).values(recognition).returning();
    return created;
  }

  async findSimilarObjects(userId: number, visualFeatures: string): Promise<ObjectRecognition[]> {
    // For now, return all user's objects for client-side similarity comparison
    // In a production system, you'd use vector similarity search
    return db.select().from(object_recognitions).where(eq(object_recognitions.user_id, userId));
  }

  async createObjectMatch(match: NewObjectMatch): Promise<ObjectMatch> {
    const [created] = await db.insert(object_matches).values(match).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
