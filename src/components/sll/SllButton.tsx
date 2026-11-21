import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--sll-primary)] text-[var(--sll-on-primary)] hover:bg-[var(--sll-primary-hover)]",
  secondary: "border border-[var(--sll-border)] bg-[var(--sll-surface-2)] text-[var(--sll-text)] hover:opacity-80",
  ghost: "bg-transparent text-[var(--sll-text-muted)] hover:bg-[var(--sll-primary-soft)] hover:text-[var(--sll-primary)]",
};

type SllButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function SllButton({ variant = "primary", className = "", ...props }: SllButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  );
}