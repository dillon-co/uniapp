"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  /** Number of extra items to render above/below the visible window */
  overscan?: number;
  /** Total height of the scroll container */
  containerHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string | number;
  className?: string;
  emptyState?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Simple windowed list renderer.
 *
 * Renders only the visible slice of `items` plus `overscan` rows above/below.
 * Items must have a fixed `itemHeight` (in px).
 */
export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 3,
  containerHeight = 600,
  renderItem,
  getKey,
  className,
  emptyState,
  ariaLabel = "List",
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount);

  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={scrollRef}
      role="list"
      aria-label={ariaLabel}
      style={{ height: containerHeight, overflowY: "auto", position: "relative" }}
      className={cn("focus-visible:outline-none", className)}
      tabIndex={0}
    >
      {/* Spacer that gives the scrollbar the correct total height */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* Rendered window, offset to the correct position */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div
              key={getKey(item, startIndex + i)}
              role="listitem"
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
