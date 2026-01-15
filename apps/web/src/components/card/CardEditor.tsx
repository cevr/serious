import { createSignal, Show, createEffect, on } from "solid-js"
import { Modal, ModalActions, Button, Input, TextArea, Select } from "@/components/ui"
import { showToast } from "@/components/ui"
import { cardStore } from "@/stores"
import type { Card } from "@serious/shared"
import "./CardEditor.css"

interface CardEditorProps {
  open: boolean
  onClose: () => void
  deckId: string
  card?: Card | null // If provided, we're editing; otherwise creating
}

const CARD_TYPES = [
  { value: "basic", label: "Basic" },
  { value: "minimal-pair", label: "Minimal Pair" },
  { value: "cloze", label: "Cloze" },
  { value: "image-word", label: "Image Word" },
  { value: "ipa", label: "IPA" },
  { value: "spelling", label: "Spelling" },
]

export function CardEditor(props: CardEditorProps) {
  const [loading, setLoading] = createSignal(false)
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  // Form state for editing
  const [front, setFront] = createSignal("")
  const [back, setBack] = createSignal("")
  const [personalNote, setPersonalNote] = createSignal("")
  const [tags, setTags] = createSignal("")

  // Reset form when card changes
  createEffect(
    on(
      () => props.card,
      (card) => {
        if (card) {
          setFront(card.front)
          setBack(card.back)
          setPersonalNote(card.personalNote ?? "")
          setTags(card.tags.join(", "))
        } else {
          setFront("")
          setBack("")
          setPersonalNote("")
          setTags("")
        }
      }
    )
  )

  const isEditing = () => !!props.card

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)

    const frontValue = (formData.get("front") as string).trim()
    const backValue = (formData.get("back") as string).trim()
    const type = formData.get("type") as "basic" | "minimal-pair" | "cloze" | "image-word" | "ipa" | "spelling"
    const note = (formData.get("personalNote") as string).trim()
    const tagsValue = (formData.get("tags") as string)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    // Validate
    const newErrors: Record<string, string> = {}
    if (!frontValue) {
      newErrors.front = "Front side is required"
    }
    if (!backValue) {
      newErrors.back = "Back side is required"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      if (isEditing() && props.card) {
        await cardStore.update(props.card.id, {
          front: frontValue,
          back: backValue,
          personalNote: note || null,
          tags: tagsValue,
        })
        showToast("success", "Card updated")
      } else {
        await cardStore.create(props.deckId, {
          type,
          front: frontValue,
          back: backValue,
          personalNote: note || undefined,
          tags: tagsValue.length > 0 ? tagsValue : undefined,
        })
        showToast("success", "Card created")
        form.reset()
      }
      props.onClose()
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to save card")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!props.card) return

    if (!confirm("Are you sure you want to delete this card? This cannot be undone.")) {
      return
    }

    setLoading(true)
    try {
      await cardStore.delete(props.card.id)
      showToast("success", "Card deleted")
      props.onClose()
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to delete card")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={isEditing() ? "Edit Card" : "Create Card"}
      size="md"
    >
      <form onSubmit={handleSubmit} class="card-editor">
        <Show when={!isEditing()}>
          <Select name="type" label="Card Type" options={CARD_TYPES} />
        </Show>

        <TextArea
          name="front"
          label="Front Side"
          placeholder="The question or prompt"
          error={errors().front}
          required
          rows={3}
          value={front()}
          onInput={(e) => setFront(e.currentTarget.value)}
        />

        <TextArea
          name="back"
          label="Back Side"
          placeholder="The answer"
          error={errors().back}
          required
          rows={3}
          value={back()}
          onInput={(e) => setBack(e.currentTarget.value)}
        />

        <TextArea
          name="personalNote"
          label="Personal Note (Optional)"
          placeholder="Add a personal connection to help remember"
          hint="Fluent Forever tip: Personal connections make memories stronger"
          rows={2}
          value={personalNote()}
          onInput={(e) => setPersonalNote(e.currentTarget.value)}
        />

        <Input
          name="tags"
          label="Tags"
          placeholder="Comma-separated, e.g., verbs, food, chapter-1"
          value={tags()}
          onInput={(e) => setTags(e.currentTarget.value)}
        />

        <ModalActions>
          <Show when={isEditing()}>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={loading()}>
              Delete
            </Button>
          </Show>
          <div style={{ flex: 1 }} />
          <Button type="button" variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading()}>
            {isEditing() ? "Save Changes" : "Create Card"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
