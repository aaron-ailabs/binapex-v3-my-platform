import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('Trader'),
  kycStatus: text("kyc_status").notNull().default('Not Started'),
  membershipTier: text("membership_tier").notNull().default('Silver'),
  withdrawalPasswordHash: text("withdrawal_password_hash"),
  withdrawalPasswordEnc: text("withdrawal_password_enc"),
  withdrawalPasswordIv: text("withdrawal_password_iv"),
  withdrawalPasswordTag: text("withdrawal_password_tag"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: integer("two_factor_enabled").default(0),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  assetName: text("asset_name").notNull(),
  balanceUsdCents: integer("balance_usd_cents").notNull().default(0),
}, (table) => ({
  wallets_user_idx: index("wallets_user_idx").on(table.userId),
  wallets_asset_idx: index("wallets_asset_idx").on(table.assetName),
}))

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  asset: text("asset").notNull(),
  amountUsdCents: integer("amount_usd_cents").notNull().default(0),
  walletAddress: text("wallet_address"),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  transactions_user_idx: index("transactions_user_idx").on(table.userId),
  transactions_time_idx: index("transactions_time_idx").on(table.createdAt),
}))

export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  ipAddress: text("ip_address").notNull(),
  details: text("details"),
  occurredAt: timestamp("occurred_at", { mode: 'date' }).notNull().default(sql`now()`),
}, (table) => ({
  security_events_user_idx: index("security_events_user_idx").on(table.userId),
  security_events_time_idx: index("security_events_time_idx").on(table.occurredAt),
}))

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: text("symbol").notNull(),
  asset: text("asset").notNull(),
  amountUsdCents: integer("amount_usd_cents").notNull(),
  direction: text("direction").notNull(),
  duration: text("duration").notNull(),
  entryPrice: integer("entry_price_cents").notNull(),
  exitPrice: integer("exit_price_cents"),
  result: text("result").notNull(),
  status: text("status").notNull(),
  payoutPct: integer("payout_pct").notNull(),
  settledUsdCents: integer("settled_usd_cents"),
  createdAt: timestamp("created_at", { mode: 'date' }).notNull().default(sql`now()`),
}, (table) => ({
  trades_user_idx: index("trades_user_idx").on(table.userId),
  trades_symbol_idx: index("trades_symbol_idx").on(table.symbol),
  trades_time_idx: index("trades_time_idx").on(table.createdAt),
}))
