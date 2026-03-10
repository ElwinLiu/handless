import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useModelStore } from "@/stores/modelStore";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { MyModelsTab } from "./MyModelsTab";
import { LibraryTab } from "./LibraryTab";

type Tab = "myModels" | "library";

export const ModelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("myModels");
  const { loading } = useModelStore();

  return (
    <motion.div
      className="max-w-3xl w-full mx-auto space-y-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div className="mb-4" variants={staggerItem} style={{ willChange: "transform" }}>
        <h1 className="text-xl font-semibold mb-2">
          {t("settings.models.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.models.description")}
        </p>
      </motion.div>

      <motion.div variants={staggerItem} style={{ willChange: "transform" }}>
        <div role="tablist" className="flex gap-1 border-b border-muted/20 mb-4">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "myModels"}
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
            role="tab"
            aria-selected={activeTab === "library"}
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

        <div role="tabpanel">
          {loading ? (
            <div className="bg-background-translucent border border-glass-border rounded">
              <div className="px-3 py-8 flex flex-col items-center gap-3">
                <div className="w-5 h-5 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
              </div>
            </div>
          ) : activeTab === "myModels" ? (
            <MyModelsTab />
          ) : (
            <LibraryTab />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
