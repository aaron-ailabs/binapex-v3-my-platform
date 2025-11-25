import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function makeQuery(result: any = { data: [], error: null }) {
  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: () => chain,
    single: async () => ({ data: null, error: null }),
    then: (resolve: any) => resolve(result)
  }
  return chain
}

export const supabase: any = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        signInWithPassword: async (_: any) => ({ data: { user: { id: 'dev', email: 'dev@local' } }, error: null }),
        signUp: async (_: any) => ({ data: { user: { id: 'dev', email: 'dev@local' } }, error: null }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null } }),
        getUser: async () => ({ data: { user: null } })
      },
      from: (_table: string) => makeQuery(),
      channel: (_name: string) => {
        const sub: any = {
          on: (_evt: any, _filter: any, _cb: any) => sub,
          subscribe: () => ({ unsubscribe: () => {} })
        }
        return sub
      }
    }
