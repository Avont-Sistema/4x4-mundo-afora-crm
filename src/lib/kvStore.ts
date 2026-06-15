import fs from 'fs';
import path from 'path';
import { getSupabase, isSupabaseEnabled } from './supabaseClient';

// Persistência genérica chave→JSON.
// Em produção: tabela `kv_collections` (name TEXT PK, data JSONB) no Supabase.
// Em dev local (sem credenciais Supabase): arquivos .data/<name>.json.
//
// Cada coleção do app (clients, suppliers, expeditions, payables, leads…) é
// guardada como UM documento JSON — array ou objeto — sob a sua chave.

const TABLE = 'kv_collections';
const DATA_DIR = path.join(process.cwd(), '.data');

export async function kvLoad<T>(key: string): Promise<T | null> {
  if (isSupabaseEnabled) {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .select('data')
      .eq('name', key)
      .maybeSingle();
    if (error) throw error;
    return data ? (data.data as T) : null;
  }

  // Fallback local
  const file = path.join(DATA_DIR, `${key}.json`);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
    }
  } catch (err) {
    console.error(`kvStore: erro ao ler ${key}.json:`, err);
  }
  return null;
}

export async function kvSave<T>(key: string, value: T): Promise<void> {
  if (isSupabaseEnabled) {
    const { error } = await getSupabase()
      .from(TABLE)
      .upsert(
        { name: key, data: value, updated_at: new Date().toISOString() },
        { onConflict: 'name' }
      );
    if (error) throw error;
    return;
  }

  // Fallback local
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${key}.json`);
    fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
  } catch (err) {
    console.error(`kvStore: erro ao escrever ${key}.json:`, err);
  }
}
