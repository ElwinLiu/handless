import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Globe } from "lucide-react";
import { LANGUAGES } from "@/lib/constants/languages";

interface LanguageFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export const LanguageFilter: React.FC<LanguageFilterProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const filteredLanguages = useMemo(() => {
    return LANGUAGES.filter(
      (lang) =>
        lang.value !== "auto" &&
        lang.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const selectedLabel = useMemo(() => {
    if (value === "all") {
      return t("settings.models.filters.allLanguages");
    }
    return LANGUAGES.find((lang) => lang.value === value)?.label || "";
  }, [value, t]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
          value !== "all"
            ? "bg-accent/20 text-accent"
            : "bg-muted/10 text-text/60 hover:bg-muted/20"
        }`}
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="max-w-[120px] truncate">{selectedLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-surface border border-muted/80 rounded shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-muted/40">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredLanguages.length > 0) {
                  onChange(filteredLanguages[0].value);
                  setOpen(false);
                  setSearch("");
                } else if (e.key === "Escape") {
                  setOpen(false);
                  setSearch("");
                }
              }}
              placeholder={t("settings.general.language.searchPlaceholder")}
              className="w-full px-2 py-1 text-sm bg-muted/10 border border-muted/40 rounded focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange("all");
                setOpen(false);
                setSearch("");
              }}
              className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                value === "all"
                  ? "bg-accent/20 text-accent font-semibold"
                  : "hover:bg-muted/10"
              }`}
            >
              {t("settings.models.filters.allLanguages")}
            </button>
            {filteredLanguages.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => {
                  onChange(lang.value);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                  value === lang.value
                    ? "bg-accent/20 text-accent font-semibold"
                    : "hover:bg-muted/10"
                }`}
              >
                {lang.label}
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <div className="px-3 py-2 text-sm text-text/50 text-center">
                {t("settings.general.language.noResults")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
