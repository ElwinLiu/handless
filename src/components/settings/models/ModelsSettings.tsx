import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useModelStore } from "@/stores/modelStore";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { TabBar, type TabItem } from "@/components/ui/TabBar";
import { MyModelsTab } from "./MyModelsTab";
import { LibraryTab } from "./LibraryTab";

type ModelTab = "myModels" | "library";

export const ModelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ModelTab>("myModels");
  const { loading } = useModelStore();

  const tabs: TabItem[] = useMemo(
    () => [
      { id: "myModels", label: t("settings.models.tabs.myModels") },
      { id: "library", label: t("settings.models.tabs.library") },
    ],
    [t],
  );

  return (
    <motion.div
      className="max-w-3xl w-full mx-auto space-y-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className="mb-4"
        variants={staggerItem}
        style={{ willChange: "transform" }}
      >
        <h1 className="text-xl font-semibold mb-2">
          {t("settings.models.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("settings.models.description")}
        </p>
      </motion.div>

      <motion.div variants={staggerItem} style={{ willChange: "transform" }}>
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as ModelTab)}
        />

        <div
          role="tabpanel"
          id="tabpanel-myModels"
          aria-labelledby="tab-myModels"
          className={activeTab !== "myModels" ? "hidden" : undefined}
        >
          {loading ? (
            <div className="bg-background-translucent border border-glass-border rounded">
              <div className="px-3 py-8 flex flex-col items-center gap-3">
                <div className="w-5 h-5 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <MyModelsTab />
          )}
        </div>
        {activeTab === "library" && (
          <div
            role="tabpanel"
            id="tabpanel-library"
            aria-labelledby="tab-library"
          >
            <LibraryTab />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
