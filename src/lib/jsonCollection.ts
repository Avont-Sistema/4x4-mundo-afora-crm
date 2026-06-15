import fs from 'fs';
import path from 'path';
import { supabase } from './supabaseClient';

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

const useSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
const DATA_DIR = path.join(process.cwd(), '.data');

export function createCollection<T extends BaseRecord>(
  name: string,
  seedFn: () => T[]
) {
  const file = path.join(DATA_DIR, `${name}.json`);
  const tableName = name;
  let cache: T[] | null = null;

  // Fallback para JSON local se Supabase não estiver configurado
  function loadLocal(): T[] {
    if (cache) return cache;
    try {
      if (fs.existsSync(file)) {
        cache = JSON.parse(fs.readFileSync(file, 'utf-8')) as T[];
        return cache;
      }
    } catch (err) {
      console.error(`Erro ao ler ${name}.json, recriando seed:`, err);
    }
    cache = seedFn();
    persistLocal();
    return cache;
  }

  function persistLocal() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(cache ?? [], null, 2), 'utf-8');
    } catch (err) {
      console.error(`Erro ao escrever ${name}.json:`, err);
    }
  }

  async function loadSupabase(): Promise<T[]> {
    if (cache) return cache;
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      cache = (data || []) as T[];
      return cache;
    } catch (err) {
      console.error(`Erro ao ler ${tableName} do Supabase:`, err);
      return [];
    }
  }

  function load(): T[] {
    if (useSupabase) {
      throw new Error(
        `${name}: Use async methods when Supabase is configured`
      );
    }
    return loadLocal();
  }

  return {
    all(): T[] {
      if (useSupabase) {
        throw new Error(
          `${name}.all() is async — use await allAsync() instead`
        );
      }
      return [...load()].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async allAsync(): Promise<T[]> {
      if (!useSupabase) {
        return this.all();
      }
      const items = await loadSupabase();
      return items.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    get(id: string): T | undefined {
      if (useSupabase) {
        throw new Error(
          `${name}.get() is async — use await getAsync() instead`
        );
      }
      return load().find((r) => r.id === id);
    },

    async getAsync(id: string): Promise<T | undefined> {
      if (!useSupabase) {
        return this.get(id);
      }
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        if (error) return undefined;
        return data as T;
      } catch {
        return undefined;
      }
    },

    create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
      if (useSupabase) {
        throw new Error(
          `${name}.create() is async — use await createAsync() instead`
        );
      }
      const now = new Date().toISOString();
      const rec = {
        ...(data as object),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as T;
      const arr = load();
      arr.push(rec);
      cache = arr;
      persistLocal();
      return rec;
    },

    async createAsync(
      data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<T> {
      if (!useSupabase) {
        return this.create(data);
      }
      const now = new Date().toISOString();
      const rec = {
        ...(data as object),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as T;
      const { data: inserted, error } = await supabase
        .from(tableName)
        .insert([rec])
        .select()
        .single();
      if (error) throw error;
      cache = null;
      return inserted as T;
    },

    update(id: string, patch: Partial<T>): T | undefined {
      if (useSupabase) {
        throw new Error(
          `${name}.update() is async — use await updateAsync() instead`
        );
      }
      const arr = load();
      const i = arr.findIndex((r) => r.id === id);
      if (i < 0) return undefined;
      const clean = { ...patch };
      delete (clean as Partial<BaseRecord>).id;
      delete (clean as Partial<BaseRecord>).createdAt;
      arr[i] = { ...arr[i], ...clean, updatedAt: new Date().toISOString() };
      cache = arr;
      persistLocal();
      return arr[i];
    },

    async updateAsync(
      id: string,
      patch: Partial<T>
    ): Promise<T | undefined> {
      if (!useSupabase) {
        return this.update(id, patch);
      }
      const clean = { ...patch };
      delete (clean as Partial<BaseRecord>).id;
      delete (clean as Partial<BaseRecord>).createdAt;
      const { data: updated, error } = await supabase
        .from(tableName)
        .update({ ...clean, updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) return undefined;
      cache = null;
      return updated as T;
    },

    remove(id: string): boolean {
      if (useSupabase) {
        throw new Error(
          `${name}.remove() is async — use await removeAsync() instead`
        );
      }
      const arr = load();
      const next = arr.filter((r) => r.id !== id);
      if (next.length === arr.length) return false;
      cache = next;
      persistLocal();
      return true;
    },

    async removeAsync(id: string): Promise<boolean> {
      if (!useSupabase) {
        return this.remove(id);
      }
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) return false;
      cache = null;
      return true;
    },

    touch(id: string): T | undefined {
      if (useSupabase) {
        throw new Error(
          `${name}.touch() is async — use await touchAsync() instead`
        );
      }
      const arr = load();
      const rec = arr.find((r) => r.id === id);
      if (!rec) return undefined;
      rec.updatedAt = new Date().toISOString();
      cache = arr;
      persistLocal();
      return rec;
    },

    async touchAsync(id: string): Promise<T | undefined> {
      if (!useSupabase) {
        return this.touch(id);
      }
      const { data: updated, error } = await supabase
        .from(tableName)
        .update({ updatedAt: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) return undefined;
      cache = null;
      return updated as T;
    },
  };
}
