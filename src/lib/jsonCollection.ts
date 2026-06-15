import { kvLoad, kvSave } from './kvStore';

// Coleção genérica persistida como um documento JSON (array) via kvStore.
// Todos os métodos são assíncronos (Supabase é assíncrono). Em dev local sem
// credenciais Supabase, o kvStore grava em .data/<nome>.json.

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export function createCollection<T extends BaseRecord>(
  name: string,
  seedFn: () => T[]
) {
  // Cache em memória por instância. Em serverless cada instância recarrega
  // do banco no cold start, então leituras refletem o estado persistido.
  let cache: T[] | null = null;

  async function load(): Promise<T[]> {
    if (cache) return cache;
    const existing = await kvLoad<T[]>(name);
    if (existing) {
      cache = existing;
      return cache;
    }
    cache = seedFn();
    await kvSave(name, cache);
    return cache;
  }

  async function persist(): Promise<void> {
    await kvSave(name, cache ?? []);
  }

  return {
    async all(): Promise<T[]> {
      const arr = await load();
      return [...arr].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async get(id: string): Promise<T | undefined> {
      return (await load()).find((r) => r.id === id);
    },

    async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
      const now = new Date().toISOString();
      const rec = {
        ...(data as object),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as T;
      const arr = await load();
      arr.push(rec);
      cache = arr;
      await persist();
      return rec;
    },

    async update(id: string, patch: Partial<T>): Promise<T | undefined> {
      const arr = await load();
      const i = arr.findIndex((r) => r.id === id);
      if (i < 0) return undefined;
      const clean = { ...patch };
      delete (clean as Partial<BaseRecord>).id;
      delete (clean as Partial<BaseRecord>).createdAt;
      arr[i] = { ...arr[i], ...clean, updatedAt: new Date().toISOString() };
      cache = arr;
      await persist();
      return arr[i];
    },

    async remove(id: string): Promise<boolean> {
      const arr = await load();
      const next = arr.filter((r) => r.id !== id);
      if (next.length === arr.length) return false;
      cache = next;
      await persist();
      return true;
    },

    // Persiste alterações feitas in-place num registro já carregado.
    async touch(id: string): Promise<T | undefined> {
      const arr = await load();
      const rec = arr.find((r) => r.id === id);
      if (!rec) return undefined;
      rec.updatedAt = new Date().toISOString();
      cache = arr;
      await persist();
      return rec;
    },
  };
}
