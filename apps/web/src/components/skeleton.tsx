import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Base skeleton element with pulse animation */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

/** Skeleton for a single card (title + body lines + footer) */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border p-6", className)} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-2/5" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <Skeleton className="mt-6 h-8 w-24" />
    </div>
  );
}

/** Skeleton grid of cards */
export function CardGridSkeleton({ count = 3, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)} aria-busy="true" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a table row */
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for a full table */
export function TableSkeleton({ rows = 5, cols = 4, className }: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)} aria-busy="true" aria-label="Loading table">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Skeleton for a list of items */
export function ListSkeleton({ count = 5, className }: SkeletonProps & { count?: number }) {
  return (
    <div
      className={cn("divide-y divide-border rounded-xl border border-border", className)}
      aria-busy="true"
      aria-label="Loading list"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="ml-4 h-8 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a stat/metric card */
export function StatSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border p-6", className)} aria-busy="true" aria-label="Loading stat">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

/** Skeleton for a page header */
export function PageHeaderSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}
