import React, { useState, useEffect, useCallback } from "react";
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
  type Icon,
} from "@phosphor-icons/react";
import { commands, type DailySpeakingStats } from "@/bindings";

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
    <div className="bg-background-translucent backdrop-blur-sm border border-muted/20 rounded px-3 py-2.5">
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

const ACCENT_COLOR = "#ef6f2f";

export const StatsSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<DailySpeakingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadStats = useCallback(async () => {
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    try {
      const result = await commands.getSpeakingStats(thirtyDaysAgo, now);
      if (result.status === "ok") {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load speaking stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const todayStats = stats.find((s) => s.date === todayStr);

  const todayWords = todayStats?.total_word_count ?? 0;
  const todayDuration = todayStats?.total_duration_ms ?? 0;
  const todayWpm = todayStats?.avg_wpm ?? 0;
  const todayTranscriptions = todayStats?.transcription_count ?? 0;

  const chartData = stats.map((s) => ({
    date: formatShortDate(s.date, i18n.language),
    wpm: Math.round(s.avg_wpm),
  }));

  const todayLabel = t("settings.stats.today");

  let content;
  if (loading) {
    content = (
      <div className="bg-background-translucent backdrop-blur-sm border border-muted/20 rounded">
        <div className="px-3 py-8 flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  } else if (stats.length === 0) {
    content = (
      <div className="bg-background-translucent backdrop-blur-sm border border-muted/20 rounded">
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
        {/* Today summary cards */}
        <div className="px-3 grid grid-cols-4 gap-2">
          <StatCard
            icon={ChatText}
            label={t("settings.stats.wordsSpoken")}
            value={String(todayWords)}
            subLabel={todayLabel}
          />
          <StatCard
            icon={Clock}
            label={t("settings.stats.recordingTime")}
            value={formatDuration(todayDuration)}
            subLabel={todayLabel}
          />
          <StatCard
            icon={Speedometer}
            label={t("settings.stats.avgWpm")}
            value={todayWpm.toFixed(0)}
            subLabel={todayLabel}
          />
          <StatCard
            icon={Hash}
            label={t("settings.stats.transcriptions")}
            value={String(todayTranscriptions)}
            subLabel={todayLabel}
          />
        </div>

        {/* Chart */}
        <div className="space-y-1.5">
          <div className="px-3">
            <h3 className="text-[11px] font-medium text-muted uppercase tracking-wide">
              {t("settings.stats.wpmOverTime")}
            </h3>
          </div>
          <div className="bg-background-translucent backdrop-blur-sm border border-muted/20 rounded px-3 py-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.55)" }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(30, 30, 30, 0.85)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.9)",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
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
      <div className="space-y-1.5">
        <div className="px-3">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
            {t("settings.stats.title")}
          </h2>
        </div>
        {content}
      </div>
    </div>
  );
};
