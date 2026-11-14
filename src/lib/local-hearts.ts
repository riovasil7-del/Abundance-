const KEY = "hojnost-local-hearts";

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

function read(store: Store): string[] {
  try {
    const parsed = JSON.parse(store.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** A heart on this device only. It does not call the server and it is not a public count. */
export function toggleLocalHeart(id: string, store: Store): boolean {
  const current = new Set(read(store));
  const next = !current.has(id);
  if (next) current.add(id);
  else current.delete(id);
  store.setItem(KEY, JSON.stringify([...current]));
  return next;
}

export function localHeartOn(id: string, store: Store): boolean {
  return read(store).includes(id);
}

export const browserHeartStore = (): Store | null =>
  typeof window === "undefined"
    ? null
    : {
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
      };
