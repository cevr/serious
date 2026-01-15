import type { JSX } from "solid-js"
import "./Badge.css"

type BadgeVariant = "default" | "new" | "learning" | "review" | "relearning" | "success" | "warning" | "error"

interface BadgeProps {
  variant?: BadgeVariant
  children: JSX.Element
  class?: string
}

export function Badge(props: BadgeProps) {
  return (
    <span class={`badge badge--${props.variant ?? "default"} ${props.class ?? ""}`}>
      {props.children}
    </span>
  )
}
