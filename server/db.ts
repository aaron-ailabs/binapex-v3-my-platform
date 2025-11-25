import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@shared/schema'

const url = process.env.DATABASE_URL || ''
export const hasDb = !!url
export const sql = hasDb ? neon(url) : null
export const db = hasDb && sql ? drizzle(sql, { schema }) : null
