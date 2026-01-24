import { relations } from "drizzle-orm"
import { boolean, date, index, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

// Objectives table
export const objectives = pgTable(
  "objectives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startDate: date("start_date").notNull().defaultNow(),
    endDate: date("end_date").notNull(),
    status: text("status", { enum: ["active", "completed", "cancelled"] })
      .notNull()
      .default("active"),
    shareToken: uuid("share_token").unique().defaultRandom(),
    isPublic: boolean("is_public").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_objectives_user_id").on(table.userId),
    index("idx_objectives_share_token").on(table.shareToken),
    index("idx_objectives_org_id").on(table.orgId),
  ]
)

// Key Results table
export const keyResults = pgTable(
  "key_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectiveId: uuid("objective_id")
      .notNull()
      .references(() => objectives.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    targetValue: numeric("target_value").notNull().default("100"),
    currentValue: numeric("current_value").notNull().default("0"),
    unit: text("unit").default("%"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_key_results_objective_id").on(table.objectiveId)]
)

// Progress Updates table
export const progressUpdates = pgTable(
  "progress_updates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyResultId: uuid("key_result_id")
      .notNull()
      .references(() => keyResults.id, { onDelete: "cascade" }),
    previousValue: numeric("previous_value").notNull(),
    newValue: numeric("new_value").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_progress_updates_key_result_id").on(table.keyResultId)]
)

// Organizations table
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    domain: text("domain").unique(),
    autoJoinDomain: boolean("auto_join_domain").default(false),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_organizations_domain").on(table.domain)]
)

// Organization Members table
export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: text("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("org_members_org_id_user_id_unique").on(table.orgId, table.userId),
    index("idx_org_members_org_id").on(table.orgId),
    index("idx_org_members_user_id").on(table.userId),
  ]
)

// Organization Invites table
export const orgInvites = pgTable(
  "org_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: ["admin", "member"] })
      .notNull()
      .default("member"),
    invitedBy: uuid("invited_by").notNull(),
    token: uuid("token").unique().defaultRandom(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique("org_invites_org_id_email_unique").on(table.orgId, table.email),
    index("idx_org_invites_org_id").on(table.orgId),
    index("idx_org_invites_email").on(table.email),
    index("idx_org_invites_token").on(table.token),
  ]
)

// Relations
export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [objectives.orgId],
    references: [organizations.id],
  }),
  keyResults: many(keyResults),
}))

export const keyResultsRelations = relations(keyResults, ({ one, many }) => ({
  objective: one(objectives, {
    fields: [keyResults.objectiveId],
    references: [objectives.id],
  }),
  progressUpdates: many(progressUpdates),
}))

export const progressUpdatesRelations = relations(progressUpdates, ({ one }) => ({
  keyResult: one(keyResults, {
    fields: [progressUpdates.keyResultId],
    references: [keyResults.id],
  }),
}))

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  invites: many(orgInvites),
  objectives: many(objectives),
}))

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
}))

export const orgInvitesRelations = relations(orgInvites, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgInvites.orgId],
    references: [organizations.id],
  }),
}))
