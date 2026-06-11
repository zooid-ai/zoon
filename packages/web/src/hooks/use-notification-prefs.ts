import { useCallback, useMemo, useSyncExternalStore } from "react";
import { MatrixClientPeg } from "@/client/peg";
import {
  addKeyword as addKeywordRule,
  getGlobalNotifMode,
  getKeywords,
  getMutedUsers,
  removeKeyword as removeKeywordRule,
  setGlobalNotifMode,
  setUserMuted,
  subscribePushRules,
  type GlobalNotifMode,
} from "@/lib/matrix/notification-prefs";

const EMPTY = JSON.stringify({ mode: "all", keywords: [], mutedUsers: [] });

export function useNotificationPrefs() {
  const json = useSyncExternalStore(
    (cb) => {
      const client = MatrixClientPeg.safeGet();
      const unsubPeg = MatrixClientPeg.subscribe(cb);
      if (!client) return unsubPeg;
      const unsubRules = subscribePushRules(client, cb);
      return () => {
        unsubRules();
        unsubPeg();
      };
    },
    () => {
      const client = MatrixClientPeg.safeGet();
      if (!client) return EMPTY;
      return JSON.stringify({
        mode: getGlobalNotifMode(client),
        keywords: getKeywords(client),
        mutedUsers: getMutedUsers(client),
      });
    },
    () => EMPTY,
  );

  const { mode, keywords, mutedUsers } = useMemo(
    () =>
      JSON.parse(json) as {
        mode: GlobalNotifMode;
        keywords: string[];
        mutedUsers: string[];
      },
    [json],
  );

  const withClient = useCallback(
    async (fn: (client: NonNullable<ReturnType<typeof MatrixClientPeg.safeGet>>) => Promise<void>) => {
      const client = MatrixClientPeg.safeGet();
      if (client) await fn(client);
    },
    [],
  );

  return {
    mode,
    keywords,
    mutedUsers,
    setMode: (m: GlobalNotifMode) => withClient((c) => setGlobalNotifMode(c, m)),
    addKeyword: (k: string) => withClient((c) => addKeywordRule(c, k)),
    removeKeyword: (k: string) => withClient((c) => removeKeywordRule(c, k)),
    muteUser: (u: string) => withClient((c) => setUserMuted(c, u, true)),
    unmuteUser: (u: string) => withClient((c) => setUserMuted(c, u, false)),
  };
}
