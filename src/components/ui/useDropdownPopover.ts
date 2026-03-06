import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useLayoutEffect,
} from "react";
import type { DropdownOption } from "./Dropdown";

export function useDropdownPopover(options: DropdownOption[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !popoverRef.current) return;
    const update = () => {
      if (!triggerRef.current || !popoverRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverHeight = popoverRef.current.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const fitsBelow = spaceBelow >= popoverHeight;
      const top = fitsBelow ? rect.bottom + 4 : rect.top - 4 - popoverHeight;
      Object.assign(popoverRef.current.style, {
        position: "fixed",
        top: `${top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setSearch("");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  const scrollHighlightedIntoView = useCallback((index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-option-index]");
    items[index]?.scrollIntoView({ block: "nearest" });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch("");
  }, []);

  const handleKeyDown = (
    e: React.KeyboardEvent,
    totalItems: number,
    onEnter: () => void,
  ) => {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < totalItems - 1 ? prev + 1 : 0;
        scrollHighlightedIntoView(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : totalItems - 1;
        scrollHighlightedIntoView(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      onEnter();
    }
  };

  return {
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
    scrollHighlightedIntoView,
    handleKeyDown,
    close,
  };
}
