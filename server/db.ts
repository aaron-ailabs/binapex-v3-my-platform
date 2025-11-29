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
