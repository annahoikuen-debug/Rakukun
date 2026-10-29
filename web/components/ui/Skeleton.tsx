"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  variant?: "block" | "line" | "circle";
  className?: string;
}

export function Skeleton({ variant = "block", className }: SkeletonProps) {
  const base =
    variant === "circle"
      ? "h-8 w-8 rounded-full"
      : variant === "line"
        ? "h-4 w-full rounded"
        : "h-full w-full rounded";

  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        base,
        className
      )}
    />
  );
}
