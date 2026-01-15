import { type JSX, For, createSignal, Show } from "solid-js"
import "./Toast.css"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: number
  type: ToastType
  message: string
}

const [toasts, setToasts] = createSignal<Toast[]>([])
let toastId = 0

export function showToast(type: ToastType, message: string, duration = 4000) {
  const id = ++toastId
  setToasts((prev) => [...prev, { id, type, message }])

  if (duration > 0) {
    setTimeout(() => dismissToast(id), duration)
  }

  return id
}

export function dismissToast(id: number) {
  setToasts((prev) => prev.filter((t) => t.id !== id))
}

const icons: Record<ToastType, JSX.Element> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

export function ToastContainer() {
  return (
    <div class="toast-container" role="region" aria-label="Notifications">
      <For each={toasts()}>
        {(toast) => (
          <div
            class={`toast toast--${toast.type}`}
            role="alert"
            aria-live="polite"
          >
            <span class="toast__icon">{icons[toast.type]}</span>
            <span class="toast__message">{toast.message}</span>
            <button
              type="button"
              class="toast__close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </For>
    </div>
  )
}
