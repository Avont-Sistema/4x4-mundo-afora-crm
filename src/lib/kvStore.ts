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

// ---------------------------------------------------------------------------
// Versão com controle de concorrência real (compare-and-swap), para quem
// precisa de leitura-mutação-escrita segura sob requisições concorrentes
// (duas pessoas mexendo na mesma coleção ao mesmo tempo). `version` é o
// `updated_at` da linha no momento da leitura; `kvSaveVersioned` só grava se
// ninguém mais escreveu naquela linha nesse meio-tempo — nesse caso devolve
// `false` e quem chamou deve reler e tentar de novo (ver jsonCollection.ts).
// ---------------------------------------------------------------------------

export interface Versioned<T> {
  value: T;
  version: string | null; // null = linha ainda não existe
}

export async function kvLoadVersioned<T>(key: string): Promise<Versioned<T> | null> {
  if (isSupabaseEnabled) {
    const { data, error } = await getSupabase()
      .from(TABLE)
      .select('data, updated_at')
      .eq('name', key)
      .maybeSingle();
    if (error) throw error;
    return data ? { value: data.data as T, version: data.updated_at as string } : null;
  }

  // Fallback local: usa o mtime do arquivo como versão.
  const file = path.join(DATA_DIR, `${key}.json`);
  try {
    if (fs.existsSync(file)) {
      const stat = fs.statSync(file);
      return {
        value: JSON.parse(fs.readFileSync(file, 'utf-8')) as T,
        version: String(stat.mtimeMs),
      };
    }
  } catch (err) {
    console.error(`kvStore: erro ao ler ${key}.json:`, err);
  }
  return null;
}

// Salva só se a linha ainda estiver na versão esperada. `expectedVersion:
// null` significa "a linha não deveria existir ainda" (criação). Retorna
// `false` em caso de conflito (outra escrita concorrente venceu).
export async function kvSaveVersioned<T>(
  key: string,
  value: T,
  expectedVersion: string | null
): Promise<boolean> {
  if (isSupabaseEnabled) {
    const nowIso = new Date().toISOString();
    if (expectedVersion === null) {
      const { error } = await getSupabase()
        .from(TABLE)
        .insert({ name: key, data: value, updated_at: nowIso });
      return !error;
    }
    const { data, error } = await getSupabase()
      .from(TABLE)
      .update({ data: value, updated_at: nowIso })
      .eq('name', key)
      .eq('updated_at', expectedVersion)
      .select('name');
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }

  // Fallback local: confere o mtime atual do arquivo antes de escrever (sem
  // await entre a checagem e a escrita, então não intercala com outra
  // requisição no mesmo processo Node).
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${key}.json`);
    const exists = fs.existsSync(file);
    if (expectedVersion === null) {
      if (exists) return false; // esperava criar, mas a linha já existe
    } else {
      if (!exists) return false; // esperava existir, mas sumiu
      const stat = fs.statSync(file);
      if (String(stat.mtimeMs) !== expectedVersion) return false; // alguém escreveu nesse meio-tempo
    }
    fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`kvStore: erro ao escrever ${key}.json:`, err);
    return false;
  }
}
