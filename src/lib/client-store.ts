import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = () => onStoreChange();
  window.addEventListener("storage", handleStorage);
  window.addEventListener("storyplay-local-change", handleStorage as EventListener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("storyplay-local-change", handleStorage as EventListener);
  };
}

export function notifyLocalStoreChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("storyplay-local-change"));
}

export function useClientStore<T>(
  getServerSnapshot: () => T,
  getClientSnapshot: () => T,
) {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
