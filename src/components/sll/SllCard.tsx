import type { HTMLAttributes } from "react";

export function SllCard({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-[var(--sll-radius)] border border-[var(--sll-border)] bg-[var(--sll-surface)] p-5 text-[var(--sll-text)] ${className}`}
    />
  );
}