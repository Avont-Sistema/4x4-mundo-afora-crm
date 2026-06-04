import fs from 'fs';
import path from 'path';

// Helper genérico de coleção persistida em arquivo JSON (.data/<nome>.json).
// Mantém cache em memória e escreve no disco a cada mutação.
// Em produção (Vercel) deve ser trocado por um banco real.

const DATA_DIR = path.join(process.cwd(), '.data');

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export function createCollection<T extends BaseRecord>(
  name: string,
  seedFn: () => T[]
) {
  const file = path.join(DATA_DIR, `${name}.json`);
  let cache: T[] | null = null;

  function load(): T[] {
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
    persist();
    return cache;
  }

  function persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(cache ?? [], null, 2), 'utf-8');
    } catch (err) {
      console.error(`Erro ao escrever ${name}.json:`, err);
    }
  }

  return {
    all(): T[] {
      return [...load()].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },
    get(id: string): T | undefined {
      return load().find((r) => r.id === id);
    },
    create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
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
      persist();
      return rec;
    },
    update(id: string, patch: Partial<T>): T | undefined {
      const arr = load();
      const i = arr.findIndex((r) => r.id === id);
      if (i < 0) return undefined;
      const clean = { ...patch };
      delete (clean as Partial<BaseRecord>).id;
      delete (clean as Partial<BaseRecord>).createdAt;
      arr[i] = { ...arr[i], ...clean, updatedAt: new Date().toISOString() };
      cache = arr;
      persist();
      return arr[i];
    },
    remove(id: string): boolean {
      const arr = load();
      const next = arr.filter((r) => r.id !== id);
      if (next.length === arr.length) return false;
      cache = next;
      persist();
      return true;
    },
    // Persiste alterações feitas diretamente num registro carregado (mutação in-place)
    touch(id: string): T | undefined {
      const arr = load();
      const rec = arr.find((r) => r.id === id);
      if (!rec) return undefined;
      rec.updatedAt = new Date().toISOString();
      cache = arr;
      persist();
      return rec;
    },
  };
}
