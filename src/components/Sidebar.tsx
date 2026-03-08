import React from "react";
import { useTranslation } from "react-i18next";
import { motion, LayoutGroup } from "motion/react";
import { DragRegion } from "./ui/DragRegion";
import {
  House,
  Command,
  Cube,
  PencilSimple,
  ClockCounterClockwise,
  ChartLineUp,
  Bug,
  Sliders,
  Info,
} from "@phosphor-icons/react";
import { useSettings } from "../hooks/useSettings";
import {
  GeneralSettings,
  ShortcutsSettings,
  AdvancedSettings,
  HistorySettings,
  StatsSettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
  ModelsSettings,
} from "./settings";
import { spring, tapScale } from "@/lib/motion";

export type SidebarSection = keyof typeof SECTIONS_CONFIG;

interface IconProps {
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  className?: string;
  [key: string]: any;
}

interface SectionConfig {
  labelKey: string;
  icon: React.ComponentType<IconProps>;
  component: React.ComponentType;
  enabled: (settings: any) => boolean;
}

export const SECTIONS_CONFIG = {
  general: {
    labelKey: "sidebar.general",
    icon: House,
    component: GeneralSettings,
    enabled: () => true,
  },
  shortcuts: {
    labelKey: "sidebar.shortcuts",
    icon: Command,
    component: ShortcutsSettings,
    enabled: () => true,
  },
  models: {
    labelKey: "sidebar.models",
    icon: Cube,
    component: ModelsSettings,
    enabled: () => true,
  },
  postprocessing: {
    labelKey: "sidebar.postProcessing",
    icon: PencilSimple,
    component: PostProcessingSettings,
    enabled: () => true,
  },
  history: {
    labelKey: "sidebar.history",
    icon: ClockCounterClockwise,
    component: HistorySettings,
    enabled: () => true,
  },
  stats: {
    labelKey: "sidebar.stats",
    icon: ChartLineUp,
    component: StatsSettings,
    enabled: () => true,
  },
  debug: {
    labelKey: "sidebar.debug",
    icon: Bug,
    component: DebugSettings,
    enabled: (settings) => settings?.debug_mode ?? false,
  },
  advanced: {
    labelKey: "sidebar.advanced",
    icon: Sliders,
    component: AdvancedSettings,
    enabled: () => true,
  },
  about: {
    labelKey: "sidebar.about",
    icon: Info,
    component: AboutSettings,
    enabled: () => true,
  },
} as const satisfies Record<string, SectionConfig>;

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const availableSections = Object.entries(SECTIONS_CONFIG)
    .filter(([_, config]) => config.enabled(settings))
    .map(([id, config]) => ({ id: id as SidebarSection, ...config }));

  return (
    <div className="flex flex-col w-40 h-full border-e border-glass-border glass-panel-heavy items-center px-2">
      <DragRegion />
      <LayoutGroup>
        <div role="tablist" className="flex flex-col w-full items-center gap-1">
          {availableSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            return (
              <motion.button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className="relative flex gap-2 items-center py-1 px-2 w-full rounded-lg cursor-pointer bg-transparent border-none text-inherit text-left"
                onClick={() => onSectionChange(section.id)}
                whileHover={{
                  backgroundColor: isActive
                    ? undefined
                    : "rgba(255,255,255,0.05)",
                }}
                whileTap={tapScale}
                transition={spring.snappy}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute inset-0 rounded-lg bg-accent/80"
                    transition={spring.snappy}
                  />
                )}
                <Icon
                  size={18}
                  weight="light"
                  className={`shrink-0 relative z-10 ${!isActive ? "opacity-85" : ""}`}
                />
                <p
                  className={`text-sm font-medium truncate relative z-10 ${!isActive ? "opacity-85" : ""}`}
                >
                  {t(section.labelKey)}
                </p>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
};
