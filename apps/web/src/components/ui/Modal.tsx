import { type JSX, Show, onMount, onCleanup, createEffect } from "solid-js"
import { Portal } from "solid-js/web"
import "./Modal.css"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: JSX.Element
  size?: "sm" | "md" | "lg"
}

export function Modal(props: ModalProps) {
  let dialogRef: HTMLDialogElement | undefined
  let previousFocus: Element | null = null

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose()
    }
  }

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === dialogRef) {
      props.onClose()
    }
  }

  createEffect(() => {
    if (props.open) {
      previousFocus = document.activeElement
      dialogRef?.showModal()
      document.body.style.overflow = "hidden"
    } else {
      dialogRef?.close()
      document.body.style.overflow = ""
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus()
      }
    }
  })

  onMount(() => {
    dialogRef?.addEventListener("keydown", handleKeyDown)
    dialogRef?.addEventListener("click", handleBackdropClick)
  })

  onCleanup(() => {
    dialogRef?.removeEventListener("keydown", handleKeyDown)
    dialogRef?.removeEventListener("click", handleBackdropClick)
    document.body.style.overflow = ""
  })

  return (
    <Portal>
      <dialog
        ref={dialogRef}
        class={`modal modal--${props.size ?? "md"}`}
        aria-labelledby={props.title ? "modal-title" : undefined}
      >
        <div class="modal__content">
          <Show when={props.title}>
            <header class="modal__header">
              <h2 id="modal-title" class="modal__title">
                {props.title}
              </h2>
              <button
                type="button"
                class="modal__close"
                onClick={props.onClose}
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </header>
          </Show>
          <div class="modal__body">{props.children}</div>
        </div>
      </dialog>
    </Portal>
  )
}

interface ModalActionsProps {
  children: JSX.Element
}

export function ModalActions(props: ModalActionsProps) {
  return <div class="modal__actions">{props.children}</div>
}
