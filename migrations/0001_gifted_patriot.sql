CREATE TABLE "object_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"original_object_id" integer NOT NULL,
	"new_photo_path" text NOT NULL,
	"confidence_score" real NOT NULL,
	"matched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "object_recognitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"photo_path" text NOT NULL,
	"user_tag" text NOT NULL,
	"detected_objects" text NOT NULL,
	"visual_features" text,
	"notes" text,
	"linked_contact_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "object_matches" ADD CONSTRAINT "object_matches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_matches" ADD CONSTRAINT "object_matches_original_object_id_object_recognitions_id_fk" FOREIGN KEY ("original_object_id") REFERENCES "public"."object_recognitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_recognitions" ADD CONSTRAINT "object_recognitions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_recognitions" ADD CONSTRAINT "object_recognitions_linked_contact_id_contacts_id_fk" FOREIGN KEY ("linked_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;