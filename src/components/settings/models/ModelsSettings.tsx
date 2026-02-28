import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useModelStore } from "@/stores/modelStore";
import { MyModelsTab } from "./MyModelsTab";
import { LibraryTab } from "./LibraryTab";

type Tab = "myModels" | "library";

export const ModelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("myModels");
  const { loading } = useModelStore();

  if (loading) {
    return (
      <div className="max-w-3xl w-full mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold mb-2">
          {t("settings.models.title")}
        </h1>
        <p className="text-sm text-text/60">
          {t("settings.models.description")}
        </p>
      </div>

      <div className="flex gap-1 border-b border-muted/20 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("myModels")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "myModels"
              ? "border-accent text-accent"
              : "border-transparent text-text/50 hover:text-text/80"
          }`}
        >
          {t("settings.models.tabs.myModels")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "library"
              ? "border-accent text-accent"
              : "border-transparent text-text/50 hover:text-text/80"
          }`}
        >
          {t("settings.models.tabs.library")}
        </button>
      </div>

      {activeTab === "myModels" ? (
        <MyModelsTab onNavigateToLibrary={() => setActiveTab("library")} />
      ) : (
        <LibraryTab />
      )}
    </div>
  );
};
