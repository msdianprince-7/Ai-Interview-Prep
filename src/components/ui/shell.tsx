import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Layout primitives shared by every page. These exist so the dark palette and
 * spacing live in one place instead of being repeated as inline hex on each
 * screen, and so responsive behaviour is consistent.
 */

export function Page({ children, center = false }: { children: ReactNode; center?: boolean }) {
  return (
    <main
      className={cn(
        "min-h-screen bg-ink text-white",
        center && "flex items-center justify-center"
      )}
    >
      {children}
    </main>
  )
}

/** Page width wrapper. Padding tightens on phones. */
export function Container({
  children,
  size = "lg",
  className,
}: {
  children: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const width = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
  }[size]

  return (
    <div className={cn("mx-auto w-full px-4 py-8 sm:px-8 sm:py-10", width, className)}>
      {children}
    </div>
  )
}

/** Top bar. Wraps rather than overflowing when the viewport is narrow. */
export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-8">
      <Link href="/dashboard" className="text-xl font-bold text-brand">
        InterviewAI
      </Link>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </nav>
  )
}

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode
  className?: string
  as?: "div" | "section"
}) {
  return (
    <Tag className={cn("rounded-xl border border-line bg-surface p-5 sm:p-6", className)}>
      {children}
    </Tag>
  )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "success"
  full?: boolean
}

export function Button({
  variant = "primary",
  full,
  className,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-brand-strong text-white hover:bg-brand-strong/90",
    ghost: "border border-line-2 bg-transparent text-body hover:bg-surface-2",
    danger: "border border-bad bg-bad-bg text-bad hover:bg-bad-bg/70",
    success: "border border-good bg-good-deep text-good hover:bg-good-deep/70",
  }[variant]

  return (
    <button
      className={cn(
        "cursor-pointer rounded-lg px-5 py-3 text-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        full && "w-full",
        variants,
        className
      )}
      {...props}
    />
  )
}

export function Badge({
  children,
  tone = "brand",
  className,
}: {
  children: ReactNode
  tone?: "brand" | "good" | "warn" | "bad"
  className?: string
}) {
  const tones = {
    brand: "border-brand-strong bg-brand-deep text-brand",
    good: "border-good bg-good-deep text-good-fg",
    warn: "border-warn bg-warn-bg text-warn-fg",
    bad: "border-bad bg-bad-bg text-bad-fg",
  }[tone]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones,
        className
      )}
    >
      {children}
    </span>
  )
}

export function Alert({ children, tone = "bad" }: { children: ReactNode; tone?: "bad" | "good" }) {
  const tones = {
    bad: "border-bad bg-bad-bg text-bad",
    good: "border-good bg-good-bg text-good-fg",
  }[tone]

  return (
    <div className={cn("mb-4 rounded-lg border p-3 text-sm", tones)}>{children}</div>
  )
}

export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-sm text-body">{label}</span>
      <input
        className="w-full rounded-lg border border-line-2 bg-surface-2 px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-brand"
        {...props}
      />
    </label>
  )
}

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon: string
  title: string
  action?: ReactNode
}) {
  return (
    <Card className="py-12 text-center">
      <div className="mb-4 text-5xl">{icon}</div>
      <p className="mb-4 text-muted">{title}</p>
      {action}
    </Card>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <Page center>
      <p className="text-muted">{label}</p>
    </Page>
  )
}
