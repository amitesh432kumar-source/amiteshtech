import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after hydration. Used by components whose first paint would
 * otherwise differ between server and client — a countdown reading the
 * viewer's clock, or a theme toggle reading the document class.
 */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
