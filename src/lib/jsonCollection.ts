import { kvLoadVersioned, kvSaveVersioned } from './kvStore';

// Coleção genérica persistida como um documento JSON (array) via kvStore.
// Todos os métodos são assíncronos (Supabase é assíncrono). Em dev local sem
// credenciais Supabase, o kvStore grava em .data/<nome>.json.
//
// Sem cache em memória entre chamadas, e toda escrita usa compare-and-swap
// (kvSaveVersioned) com retry: lê a versão mais recente, aplica a mutação
// em cima dela e só grava se ninguém mais escreveu nesse meio-tempo — senão
// recarrega e tenta de novo. Isso evita o bug de "registro sumiu do nada":
// duas requisições concorrentes (dois clientes se cadastrando ao mesmo
// tempo, dois custos lançados juntos, etc.) cada uma lendo o estado antigo e
// uma sobrescrevendo silenciosamente a mudança da outra ao salvar.

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export function createCollection<T extends BaseRecord>(
  name: string,
  seedFn: () => T[]
) {
  async function loadOrSeed(): Promise<T[]> {
    const loaded = await kvLoadVersioned<T[]>(name);
    if (loaded) return loaded.value;
    const seeded = seedFn();
    // Melhor esforço: se perder a corrida de seed (outra requisição seedou
    // primeiro), a próxima leitura já pega o que venceu — sem problema.
    await kvSaveVersioned(name, seeded, null);
    return seeded;
  }

  // Aplica `mutate` sobre a versão mais recente da coleção e salva com
  // compare-and-swap, retentando se outra escrita venceu a corrida.
  async function withRetry<R>(
    mutate: (arr: T[]) => { found: boolean; result: R }
  ): Promise<R> {
    const maxAttempts = 8;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const loaded = await kvLoadVersioned<T[]>(name);
      const arr = loaded ? loaded.value : seedFn();
      const version = loaded ? loaded.version : null;
      const { found, result } = mutate(arr);
      if (!found) return result; // nada mudou, não precisa gravar
      const ok = await kvSaveVersioned(name, arr, version);
      if (ok) return result;
      // conflito: alguém gravou nesse meio-tempo — recarrega e tenta de novo
    }
    throw new Error(
      `jsonCollection(${name}): não foi possível salvar após ${maxAttempts} tentativas (concorrência muito alta)`
    );
  }

  return {
    async all(): Promise<T[]> {
      const arr = await loadOrSeed();
      return [...arr].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async get(id: string): Promise<T | undefined> {
      return (await loadOrSeed()).find((r) => r.id === id);
    },

    async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
      const now = new Date().toISOString();
      const rec = {
        ...(data as object),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as T;
      return withRetry((arr) => {
        arr.push(rec);
        return { found: true, result: rec };
      });
    },

    async update(id: string, patch: Partial<T>): Promise<T | undefined> {
      return withRetry((arr) => {
        const i = arr.findIndex((r) => r.id === id);
        if (i < 0) return { found: false, result: undefined };
        const clean = { ...patch };
        delete (clean as Partial<BaseRecord>).id;
        delete (clean as Partial<BaseRecord>).createdAt;
        arr[i] = { ...arr[i], ...clean, updatedAt: new Date().toISOString() };
        return { found: true, result: arr[i] };
      });
    },

    async remove(id: string): Promise<boolean> {
      return withRetry((arr) => {
        const idx = arr.findIndex((r) => r.id === id);
        if (idx < 0) return { found: false, result: false };
        arr.splice(idx, 1);
        return { found: true, result: true };
      });
    },

    // Aplica uma mutação num registro (ex.: exp.enrollments.push(...)) sempre
    // em cima da cópia mais recente do banco — não da que o chamador buscou
    // antes — e com retry em caso de escrita concorrente no mesmo registro
    // (ex.: dois custos lançados na mesma expedição ao mesmo tempo).
    async touchWith(id: string, mutate: (record: T) => void): Promise<T | undefined> {
      return withRetry((arr) => {
        const rec = arr.find((r) => r.id === id);
        if (!rec) return { found: false, result: undefined };
        mutate(rec);
        rec.updatedAt = new Date().toISOString();
        return { found: true, result: rec };
      });
    },
  };
}
