import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@shared/schema'
import { createClient } from '@supabase/supabase-js'

const url = process.env.DATABASE_URL || ''
export const hasDb = !!url
const client = hasDb ? neon(url) : null
export const db = hasDb && client ? drizzle(client, { schema }) : null

const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
export const hasSupabase = !!(supabaseUrl && supabaseServiceKey)
export const sb = hasSupabase ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null

export async function ensureSchema(): Promise<void> {
  if (!hasDb || !client) return
  try {
    await client`CREATE EXTENSION IF NOT EXISTS pgcrypto`
    await client`CREATE TABLE IF NOT EXISTS users (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      username text UNIQUE NOT NULL,
      password text NOT NULL,
      role text NOT NULL DEFAULT 'Trader',
      kyc_status text NOT NULL DEFAULT 'Not Started',
      membership_tier text NOT NULL DEFAULT 'Silver',
      withdrawal_password_hash text,
      withdrawal_password_enc text,
      withdrawal_password_iv text,
      withdrawal_password_tag text,
      two_factor_secret text,
      two_factor_enabled integer NOT NULL DEFAULT 0,
      reset_password_token text,
      reset_password_expires bigint,
      payout_pct integer NOT NULL DEFAULT 85
    )`
    await client`CREATE INDEX IF NOT EXISTS users_username_idx ON users(username)`
    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS withdrawal_password_hash text`
    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS withdrawal_password_enc text`
    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS withdrawal_password_iv text`
    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS withdrawal_password_tag text`
    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS two_factor_secret text`
    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS two_factor_enabled integer DEFAULT 0`
    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS reset_password_token text`
    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS reset_password_expires bigint`

    await client`CREATE TABLE IF NOT EXISTS wallets (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      asset_name text NOT NULL,
      balance_usd_cents integer NOT NULL DEFAULT 0
    )`
    await client`CREATE INDEX IF NOT EXISTS wallets_user_idx ON wallets(user_id)`
    await client`CREATE INDEX IF NOT EXISTS wallets_asset_idx ON wallets(asset_name)`

    await client`CREATE TABLE IF NOT EXISTS trades (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      symbol text NOT NULL,
      asset text NOT NULL,
      amount_usd_cents integer NOT NULL,
      direction text NOT NULL,
      duration text NOT NULL,
      entry_price integer NOT NULL,
      exit_price integer,
      result text NOT NULL DEFAULT 'Pending',
      status text NOT NULL DEFAULT 'Open',
      payout_pct integer,
      settled_usd_cents integer,
      created_at timestamp NOT NULL DEFAULT now()
    )`
    await client`CREATE INDEX IF NOT EXISTS trades_user_idx ON trades(user_id)`
    await client`CREATE INDEX IF NOT EXISTS trades_symbol_idx ON trades(symbol)`
    await client`CREATE INDEX IF NOT EXISTS trades_time_idx ON trades(created_at)`
    await client`ALTER TABLE IF EXISTS trades ADD COLUMN IF NOT EXISTS entry_price_cents integer`
    await client`ALTER TABLE IF EXISTS trades ADD COLUMN IF NOT EXISTS exit_price_cents integer`
    await client`UPDATE trades SET entry_price_cents = entry_price WHERE entry_price_cents IS NULL`
    await client`UPDATE trades SET exit_price_cents = exit_price WHERE exit_price_cents IS NULL`
    await client`ALTER TABLE IF EXISTS trades DROP COLUMN IF EXISTS entry_price`
    await client`ALTER TABLE IF EXISTS trades DROP COLUMN IF EXISTS exit_price`

    await client`CREATE TABLE IF NOT EXISTS notifications (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      type text NOT NULL,
      title text,
      message text NOT NULL,
      read integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now()
    )`
    await client`CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id)`
    await client`CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read)`

    await client`CREATE TABLE IF NOT EXISTS security_events (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      type text NOT NULL,
      status text NOT NULL,
      ip_address text,
      details text,
      occurred_at timestamp NOT NULL DEFAULT now()
    )`
    await client`CREATE INDEX IF NOT EXISTS security_events_user_idx ON security_events(user_id)`
    await client`CREATE INDEX IF NOT EXISTS security_events_time_idx ON security_events(occurred_at)`

    await client`CREATE TABLE IF NOT EXISTS transactions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id varchar NOT NULL,
      type text NOT NULL,
      asset text NOT NULL,
      amount_usd_cents integer NOT NULL,
      wallet_address text,
      status text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`
    await client`CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions(user_id)`
    await client`CREATE INDEX IF NOT EXISTS transactions_time_idx ON transactions(created_at)`

    await client`ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS payout_pct integer`
    await client`ALTER TABLE IF EXISTS trades ADD COLUMN IF NOT EXISTS payout_pct integer`
    await client`ALTER TABLE users ALTER COLUMN payout_pct SET DEFAULT 85`
    await client`UPDATE users SET payout_pct = 85 WHERE payout_pct IS NULL`
    await client`CREATE TABLE IF NOT EXISTS payout_audits (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), admin_id varchar NOT NULL, user_id varchar NOT NULL, old_pct integer NOT NULL, new_pct integer NOT NULL, reason text, created_at timestamp NOT NULL DEFAULT now())`
    await client`CREATE INDEX IF NOT EXISTS payout_audits_user_idx ON payout_audits(user_id)`
    await client`CREATE INDEX IF NOT EXISTS payout_audits_admin_idx ON payout_audits(admin_id)`
    await client`CREATE TABLE IF NOT EXISTS payout_overrides (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), user_id varchar NOT NULL, trader_id varchar NOT NULL, pct integer NOT NULL, start_date timestamp NOT NULL, end_date timestamp NOT NULL, created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now())`
    await client`CREATE INDEX IF NOT EXISTS payout_overrides_user_idx ON payout_overrides(user_id)`
    await client`CREATE INDEX IF NOT EXISTS payout_overrides_trader_idx ON payout_overrides(trader_id)`
    await client`CREATE TABLE IF NOT EXISTS chat_sessions (id varchar PRIMARY KEY, initiator_id varchar, status text NOT NULL DEFAULT 'active', created_at timestamp NOT NULL DEFAULT now(), closed_at timestamp)`
    await client`CREATE INDEX IF NOT EXISTS chat_sessions_status_idx ON chat_sessions(status)`
    await client`CREATE TABLE IF NOT EXISTS chat_messages (id varchar PRIMARY KEY DEFAULT gen_random_uuid(), session_id varchar NOT NULL, sender text NOT NULL, text text, timestamp timestamp NOT NULL DEFAULT now(), read_by text)`
    await client`CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id)`
    await client`CREATE INDEX IF NOT EXISTS chat_messages_time_idx ON chat_messages(timestamp)`
  } catch {}
}
