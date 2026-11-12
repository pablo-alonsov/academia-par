CREATE TABLE `drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `word_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
