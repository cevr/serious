import { type JSX, splitProps, Show, createUniqueId } from "solid-js"
import "./Input.css"

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["label", "error", "hint", "class", "id"])
  const id = local.id ?? createUniqueId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div class={`input-field ${local.class ?? ""}`} data-error={local.error ? "" : undefined}>
      <Show when={local.label}>
        <label class="input-field__label" for={id}>
          {local.label}
        </label>
      </Show>
      <input
        id={id}
        class="input-field__input"
        aria-invalid={local.error ? "true" : undefined}
        aria-describedby={local.error ? errorId : local.hint ? hintId : undefined}
        {...rest}
      />
      <Show when={local.error}>
        <p id={errorId} class="input-field__error" role="alert">
          {local.error}
        </p>
      </Show>
      <Show when={local.hint && !local.error}>
        <p id={hintId} class="input-field__hint">
          {local.hint}
        </p>
      </Show>
    </div>
  )
}

interface TextAreaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function TextArea(props: TextAreaProps) {
  const [local, rest] = splitProps(props, ["label", "error", "hint", "class", "id"])
  const id = local.id ?? createUniqueId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div class={`input-field ${local.class ?? ""}`} data-error={local.error ? "" : undefined}>
      <Show when={local.label}>
        <label class="input-field__label" for={id}>
          {local.label}
        </label>
      </Show>
      <textarea
        id={id}
        class="input-field__input input-field__textarea"
        aria-invalid={local.error ? "true" : undefined}
        aria-describedby={local.error ? errorId : local.hint ? hintId : undefined}
        {...rest}
      />
      <Show when={local.error}>
        <p id={errorId} class="input-field__error" role="alert">
          {local.error}
        </p>
      </Show>
      <Show when={local.hint && !local.error}>
        <p id={hintId} class="input-field__hint">
          {local.hint}
        </p>
      </Show>
    </div>
  )
}

interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["label", "error", "options", "class", "id"])
  const id = local.id ?? createUniqueId()
  const errorId = `${id}-error`

  return (
    <div class={`input-field ${local.class ?? ""}`} data-error={local.error ? "" : undefined}>
      <Show when={local.label}>
        <label class="input-field__label" for={id}>
          {local.label}
        </label>
      </Show>
      <div class="input-field__select-wrapper">
        <select
          id={id}
          class="input-field__input input-field__select"
          aria-invalid={local.error ? "true" : undefined}
          aria-describedby={local.error ? errorId : undefined}
          {...rest}
        >
          {local.options.map((opt) => (
            <option value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span class="input-field__select-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      <Show when={local.error}>
        <p id={errorId} class="input-field__error" role="alert">
          {local.error}
        </p>
      </Show>
    </div>
  )
}
