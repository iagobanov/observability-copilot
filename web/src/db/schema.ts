import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const analysisRuns = pgTable("analysis_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  githubUserId: text("github_user_id"),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  score: integer("score"),
  stack: text("stack").notNull().default(""),
  focusPath: text("focus_path").notNull().default(""),
  fullMarkdown: text("full_markdown").notNull(),
  source: text("source").notNull().default("web"),
  filesAnalyzed: integer("files_analyzed"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
