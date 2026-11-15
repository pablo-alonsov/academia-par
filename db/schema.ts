import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// Separate domain tables keep ownership independent of editable teaching payloads.
function entity(name: string) {
  return sqliteTable(name, {
    id: text("id").primaryKey(),
    studentId: text("student_id"),
    data: text("data").notNull(),
    updatedAt: text("updated_at").notNull(),
  });
}
export const students = entity("students");
export const subjects = entity("subjects");
export const skills = entity("skills");
export const sessions = entity("sessions");
export const resources = entity("resources");
export const activities = entity("activities");
export const assignments = entity("assignments");
export const responses = entity("responses");
export const evidence = entity("evidence");
export const observations = entity("observations");
export const doubts = entity("doubts");
export const exams = entity("exams");
export const files = entity("files");
export const drafts = entity("drafts");
export const wordEntries = entity("word_entries");
export const appSessions = sqliteTable("app_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  profile: text("profile").notNull(),
  expiresAt: integer("expires_at").notNull(),
  platformUserId: text("platform_user_id"),
});
export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(),
});

// Teacher-only delivery metadata, deliberately outside student data snapshots.
export const notificationOutbox = sqliteTable("notification_outbox", {
  id: text("id").primaryKey(),
  studentId: text("student_id"),
  eventJson: text("event_json").notNull(),
  status: text("status").notNull().default("pending"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  generation: integer("generation").notNull().default(0),
  firstAttemptAt: integer("first_attempt_at"),
  nextAttemptAt: integer("next_attempt_at").notNull().default(0),
  leaseToken: text("lease_token"),
  leaseUntil: integer("lease_until").notNull().default(0),
  deliveryJson: text("delivery_json"),
  providerId: text("provider_id"),
  acceptedAt: text("accepted_at"),
  lastError: text("last_error"),
}, table => [index("notification_outbox_pending").on(table.status,table.nextAttemptAt,table.occurredAt)]);
