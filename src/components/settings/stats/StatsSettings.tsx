import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChatText,
  Clock,
  Speedometer,
  Trash,
  Hash,
  CalendarBlank,
  type Icon,
} from "@phosphor-icons/react";
import {
  commands,
  type DailySpeakingStats,
  type StatsDateRange,
} from "@/bindings";
import { useSettingsStore } from "@/stores/settingsStore";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatShortDate(dateStr: string, locale: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function StatCard({
  icon: IconComponent,
  label,
  value,
  subLabel,
}: {
  icon: Icon;
  label: string;
  value: string;
  subLabel: string;
}) {
  return (
    <div className="bg-background-translucent backdrop-blur-sm border border-glass-border rounded px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <IconComponent size={12} className="text-muted" />
        <span className="text-[10px] text-muted uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted/70">{subLabel}</p>
    </div>
  );
}

const RANGE_PRESETS: StatsDateRange[] = [
  "today",
  "3days",
  "week",
  "month",
  "all",
  "custom",
];

const ACCENT_COLOR = "var(--color-accent)";

export const StatsSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { getSetting, updateSetting } = useSettingsStore();
  const [stats, setStats] = useState<DailySpeakingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const savedRange = getSetting("stats_date_range") ?? "month";
  const range: StatsDateRange = RANGE_PRESETS.includes(
    savedRange as StatsDateRange,
  )
    ? (savedRange as StatsDateRange)
    : "month";

  const setRange = useCallback(
    (preset: StatsDateRange) => {
      updateSetting("stats_date_range", preset);
    },
    [updateSetting],
  );

  const todayDateStr = useMemo(() => toDateStr(new Date()), []);
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateStr(d);
  });
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()));

  const getDateRange = useCallback((): { from: number; to: number } => {
    const now = Math.floor(Date.now() / 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayStart = Math.floor(startOfToday.getTime() / 1000);

    switch (range) {
      case "today":
        return { from: todayStart, to: now };
      case "3days":
        return { from: todayStart - 2 * 86400, to: now };
      case "week":
        return { from: todayStart - 6 * 86400, to: now };
      case "month":
        return { from: todayStart - 29 * 86400, to: now };
      case "all":
        return { from: 0, to: now };
      case "custom": {
        const fromDate = customFrom
          ? new Date(customFrom + "T00:00:00")
          : new Date(0);
        const toDate = customTo ? new Date(customTo + "T23:59:59") : new Date();
        return {
          from: Math.floor(fromDate.getTime() / 1000),
          to: Math.floor(toDate.getTime() / 1000),
        };
      }
    }
  }, [range, customFrom, customTo]);

  const loadStats = useCallback(async () => {
    const { from, to } = getDateRange();
    setLoading(true);
    try {
      const result = await commands.getSpeakingStats(from, to);
      if (result.status === "ok") {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load speaking stats:", error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    const result = await commands.clearSpeakingStats();
    if (result.status === "ok") {
      setStats([]);
    }
    setConfirmClear(false);
  };

  const aggregated = useMemo(() => {
    const totalWords = stats.reduce((sum, s) => sum + s.total_word_count, 0);
    const totalDuration = stats.reduce(
      (sum, s) => sum + s.total_duration_ms,
      0,
    );
    const totalTranscriptions = stats.reduce(
      (sum, s) => sum + s.transcription_count,
      0,
    );
    const avgWpm = totalDuration > 0 ? (totalWords * 60000) / totalDuration : 0;
    return { totalWords, totalDuration, avgWpm, totalTranscriptions };
  }, [stats]);

  const rangeLabel = t(`settings.stats.range.${range}`);

  const chartData = stats.map((s) => ({
    date: formatShortDate(s.date, i18n.language),
    wpm: Math.round(s.avg_wpm),
  }));

  let content;
  if (loading) {
    content = (
      <div className="bg-background-translucent backdrop-blur-sm border border-glass-border rounded">
        <div className="px-3 py-8 flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  } else if (stats.length === 0) {
    content = (
      <div className="bg-background-translucent backdrop-blur-sm border border-glass-border rounded">
        <div className="px-3 py-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted/10 flex items-center justify-center">
            <Speedometer className="w-5 h-5 text-muted" />
          </div>
          <p className="text-sm text-muted text-center">
            {t("settings.stats.noData")}
          </p>
        </div>
      </div>
    );
  } else {
    content = (
      <>
        {/* Summary cards */}
        <div className="px-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard
            icon={ChatText}
            label={t("settings.stats.wordsSpoken")}
            value={String(aggregated.totalWords)}
            subLabel={rangeLabel}
          />
          <StatCard
            icon={Clock}
            label={t("settings.stats.recordingTime")}
            value={formatDuration(aggregated.totalDuration)}
            subLabel={rangeLabel}
          />
          <StatCard
            icon={Speedometer}
            label={t("settings.stats.avgWpm")}
            value={aggregated.avgWpm.toFixed(0)}
            subLabel={rangeLabel}
          />
          <StatCard
            icon={Hash}
            label={t("settings.stats.transcriptions")}
            value={String(aggregated.totalTranscriptions)}
            subLabel={rangeLabel}
          />
        </div>

        {/* Chart */}
        <div className="space-y-1.5">
          <div className="px-3">
            <h3 className="text-[11px] font-medium text-muted uppercase tracking-wide">
              {t("settings.stats.wpmOverTime")}
            </h3>
          </div>
          <div className="bg-background-translucent backdrop-blur-sm border border-glass-border rounded px-3 py-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-glass-bg-solid)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid var(--color-glass-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--color-text)",
                  }}
                  labelStyle={{ color: "var(--color-muted)" }}
                />
                <Line
                  type="monotone"
                  dataKey="wpm"
                  stroke={ACCENT_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: ACCENT_COLOR }}
                  activeDot={{ r: 5, fill: ACCENT_COLOR }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clear stats */}
        <div className="px-3">
          <button
            onClick={handleClear}
            onBlur={() => setConfirmClear(false)}
            className="flex items-center gap-1.5 text-[11px] text-muted/70 hover:text-red-400 transition-colors"
          >
            <Trash size={12} />
            {confirmClear
              ? t("settings.stats.confirmClear")
              : t("settings.stats.clearStats")}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-4">
      <div className="space-y-3">
        <div className="px-3">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
            {t("settings.stats.title")}
          </h2>
        </div>

        {/* Range selector */}
        <div className="px-3 flex flex-wrap items-center gap-1.5">
          {RANGE_PRESETS.map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                range === key
                  ? "bg-accent text-white"
                  : "bg-background-translucent border border-glass-border text-muted hover:text-text hover:border-muted/40"
              }`}
            >
              {key === "custom" && (
                <CalendarBlank
                  size={11}
                  className="inline mr-1 -mt-px"
                  weight="bold"
                />
              )}
              {t(`settings.stats.range.${key}`)}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {range === "custom" && (
          <div className="px-3 flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-muted">
              {t("settings.stats.range.from")}
              <input
                type="date"
                value={customFrom}
                max={customTo || todayDateStr}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-background-translucent border border-glass-border rounded px-2 py-1 text-[11px] text-text focus:outline-none focus:border-accent/50"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-muted">
              {t("settings.stats.range.to")}
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayDateStr}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-background-translucent border border-glass-border rounded px-2 py-1 text-[11px] text-text focus:outline-none focus:border-accent/50"
              />
            </label>
          </div>
        )}

        {content}
      </div>
    </div>
  );
};
