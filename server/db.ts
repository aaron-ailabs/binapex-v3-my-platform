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
