import React, { useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ChevronIcon } from "./Dropdown";
import type { DropdownOption } from "./Dropdown";
import { useDropdownPopover } from "./useDropdownPopover";

interface MultiSelectDropdownProps {
  options: DropdownOption[];
  className?: string;
  selectedValues: string[];
  onSelect: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onSelect,
  className = "",
  placeholder = "Select options...",
  disabled = false,
  searchPlaceholder,
}) => {
  const { t } = useTranslation();
  const {
    isOpen,
    setIsOpen,
    search,
    setSearch,
    highlightedIndex,
    setHighlightedIndex,
    triggerRef,
    popoverRef,
    searchInputRef,
    listRef,
    filteredOptions,
    handleKeyDown,
  } = useDropdownPopover(options);

  useEffect(() => {
    setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
  }, [filteredOptions.length]);

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const selectedLabels = useMemo(() => {
    return selectedValues
      .map((v) => options.find((opt) => opt.value === v))
      .filter(Boolean) as DropdownOption[];
  }, [options, selectedValues]);

  const toggleValue = useCallback(
    (value: string) => {
      if (selectedSet.has(value)) {
        onSelect(selectedValues.filter((v) => v !== value));
      } else {
        onSelect([...selectedValues, value]);
      }
    },
    [selectedValues, selectedSet, onSelect],
  );

  const removeValue = useCallback(
    (value: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(selectedValues.filter((v) => v !== value));
    },
    [selectedValues, onSelect],
  );

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    handleKeyDown(e, filteredOptions.length, () => {
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        toggleValue(filteredOptions[highlightedIndex].value);
      }
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "px-2 py-1 text-sm font-semibold bg-glass-bg border border-glass-border rounded backdrop-blur-sm",
          "min-w-[160px] text-start flex items-center justify-between gap-1",
          "transition-all duration-150",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-glass-highlight cursor-pointer hover:border-glass-border-hover",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          className,
        )}
      >
        <span className="flex flex-wrap gap-1 items-center min-h-[20px]">
          {selectedLabels.length > 0 ? (
            selectedLabels.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded bg-primary/15 text-text"
              >
                {opt.label}
                <button
                  type="button"
                  className="ml-0.5 hover:text-accent transition-colors"
                  onClick={(e) => removeValue(opt.value, e)}
                  tabIndex={-1}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronIcon rotated={isOpen} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{ position: "fixed" }}
            className={cn(
              "z-50 rounded-lg shadow-glass-hover overflow-hidden",
              "border border-glass-border",
              "bg-[var(--color-glass-bg-solid)]",
            )}
          >
            <div className="p-2 border-b border-glass-border">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder || t("common.search")}
                className="w-full px-2 py-1 text-sm bg-glass-bg border border-glass-border rounded focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div ref={listRef} className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-2 py-2 text-sm text-muted-foreground text-center">
                  {t("common.noOptionsFound")}
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = selectedSet.has(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      data-option-index={index}
                      className={cn(
                        "w-full px-2 py-1 text-sm text-start transition-colors duration-150 cursor-pointer flex items-center gap-2",
                        isSelected
                          ? "bg-primary/20 font-semibold"
                          : highlightedIndex === index
                            ? "bg-primary/10"
                            : "hover:bg-primary/10",
                        option.disabled && "opacity-50 cursor-not-allowed",
                      )}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => toggleValue(option.value)}
                    >
                      <span
                        className={cn(
                          "w-3.5 h-3.5 shrink-0 rounded-sm border flex items-center justify-center",
                          isSelected
                            ? "bg-primary/60 border-primary/80"
                            : "border-glass-border",
                        )}
                      >
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </span>
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
