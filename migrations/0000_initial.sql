-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" integer DEFAULT (unixepoch())
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS "reminders" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"schedule_cron" text NOT NULL,
	"next_run_at" integer NOT NULL,
	"active" integer DEFAULT 1,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create medications table
CREATE TABLE IF NOT EXISTS "medications" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"dosage" text NOT NULL,
	"notes" text,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create medication_logs table
CREATE TABLE IF NOT EXISTS "medication_logs" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"medication_id" integer NOT NULL,
	"taken_at" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("medication_id") REFERENCES "medications"("id") ON UPDATE no action ON DELETE no action
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"relation" text NOT NULL,
	"phone" text,
	"email" text,
	"photo_path" text,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create locations table
CREATE TABLE IF NOT EXISTS "locations" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"context" text,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create location_logs table
CREATE TABLE IF NOT EXISTS "location_logs" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"recorded_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"content_text" text,
	"audio_path" text,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create memory_items table
CREATE TABLE IF NOT EXISTS "memory_items" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"file_path" text NOT NULL,
	"title" text NOT NULL,
	"tags" text,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create routines table
CREATE TABLE IF NOT EXISTS "routines" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"routine_id" integer NOT NULL,
	"title" text NOT NULL,
	"done" integer DEFAULT 0,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON UPDATE no action ON DELETE no action
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS "quiz_questions" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" integer DEFAULT (unixepoch()),
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create emergency_alerts table
CREATE TABLE IF NOT EXISTS "emergency_alerts" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" integer NOT NULL,
	"triggered_at" integer DEFAULT (unixepoch()),
	"resolved" integer DEFAULT 0,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE no action
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");
