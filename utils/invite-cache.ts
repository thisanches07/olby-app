import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "invite_link_cache";

interface CachedInvite {
  inviteUrl: string;
  expiresAt: string; // ISO 8601
}

type CacheMap = Record<string, CachedInvite>;

async function readMap(): Promise<CacheMap> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheMap;
  } catch {
    return {};
  }
}

async function writeMap(map: CacheMap): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // Best-effort — falha silenciosa para nunca quebrar o modal
  }
}

function isExpired(isoString: string): boolean {
  return new Date(isoString).getTime() <= Date.now();
}

export const inviteCache = {
  /**
   * Retorna o link cacheado se existir e não tiver expirado.
   * Remove automaticamente entradas expiradas.
   */
  get: async (projectId: string): Promise<CachedInvite | null> => {
    const map = await readMap();
    const entry = map[projectId];
    if (!entry) return null;
    if (isExpired(entry.expiresAt)) {
      const { [projectId]: _removed, ...rest } = map;
      void writeMap(rest);
      return null;
    }
    return entry;
  },

  /**
   * Salva (ou sobrescreve) o link para um projeto.
   */
  set: async (projectId: string, invite: CachedInvite): Promise<void> => {
    const map = await readMap();
    await writeMap({ ...map, [projectId]: invite });
  },
};
