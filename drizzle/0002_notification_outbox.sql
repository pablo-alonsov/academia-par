CREATE TABLE IF NOT EXISTS `notification_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text,
	`event_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`generation` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` integer,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`delivery_json` text,
	`provider_id` text,
	`accepted_at` text,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `notification_outbox_pending` ON `notification_outbox` (`status`,`next_attempt_at`,`occurred_at`);