import { useEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";

export const useSettings = () => {
  const store = useSettingsStore();

  useEffect(() => {
    if (store.isLoading) store.initialize();
  }, [store.initialize, store.isLoading]);

  return {
    ...store,
    isUpdating: store.isUpdatingKey,
  };
};
