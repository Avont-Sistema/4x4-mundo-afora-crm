import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente Supabase para uso EXCLUSIVO no servidor (rotas /api e libs).
// Usa a chave secreta (service role) — nunca exponha no navegador.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Quando ambos estão presentes, a persistência usa o Supabase.
// Caso contrário (ex.: dev local sem credenciais) cai no JSON em .data/.
export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseSecretKey);

let instance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY'
    );
  }
  if (!instance) {
    instance = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return instance;
}
