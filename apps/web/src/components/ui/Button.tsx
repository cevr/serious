import { type JSX, splitProps, Show } from "solid-js"
import "./Button.css"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: JSX.Element
  iconRight?: JSX.Element
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "icon",
    "iconRight",
    "children",
    "class",
    "disabled",
  ])

  return (
    <button
      class={`btn btn--${local.variant ?? "primary"} btn--${local.size ?? "md"} ${local.class ?? ""}`}
      disabled={local.disabled || local.loading}
      data-loading={local.loading ? "" : undefined}
      {...rest}
    >
      <Show when={local.loading}>
        <span class="btn__spinner" aria-hidden="true" />
      </Show>
      <Show when={local.icon && !local.loading}>
        <span class="btn__icon btn__icon--left">{local.icon}</span>
      </Show>
      <span class="btn__label">{local.children}</span>
      <Show when={local.iconRight}>
        <span class="btn__icon btn__icon--right">{local.iconRight}</span>
      </Show>
    </button>
  )
}
