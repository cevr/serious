import { createSignal } from "solid-js"
import { Modal, ModalActions, Button, Input, TextArea, Select } from "@/components/ui"
import { showToast } from "@/components/ui"
import { deckStore } from "@/stores"
import "./CreateDeckModal.css"

interface CreateDeckModalProps {
  open: boolean
  onClose: () => void
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
]

const STAGES = [
  { value: "pronunciation", label: "Pronunciation" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "grammar", label: "Grammar" },
]

export function CreateDeckModal(props: CreateDeckModalProps) {
  const [loading, setLoading] = createSignal(false)
  const [errors, setErrors] = createSignal<Record<string, string>>({})

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)

    const name = (formData.get("name") as string).trim()
    const description = (formData.get("description") as string).trim()
    const targetLanguage = formData.get("targetLanguage") as string
    const nativeLanguage = formData.get("nativeLanguage") as string
    const stage = formData.get("stage") as "pronunciation" | "vocabulary" | "grammar"
    const newCardsPerDay = parseInt(formData.get("newCardsPerDay") as string, 10)

    // Validate
    const newErrors: Record<string, string> = {}
    if (!name) {
      newErrors.name = "Name is required"
    }
    if (!targetLanguage) {
      newErrors.targetLanguage = "Target language is required"
    }
    if (!nativeLanguage) {
      newErrors.nativeLanguage = "Native language is required"
    }
    if (targetLanguage === nativeLanguage) {
      newErrors.targetLanguage = "Target and native languages must be different"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      await deckStore.create({
        name,
        description: description || undefined,
        targetLanguage,
        nativeLanguage,
        stage,
        newCardsPerDay: newCardsPerDay || 20,
      })
      showToast("success", `Deck "${name}" created`)
      props.onClose()
      form.reset()
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to create deck")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title="Create New Deck" size="md">
      <form onSubmit={handleSubmit} class="create-deck-form">
        <Input
          name="name"
          label="Deck Name"
          placeholder="e.g., Spanish Vocabulary"
          error={errors().name}
          required
        />

        <TextArea
          name="description"
          label="Description"
          placeholder="What will you learn with this deck?"
          rows={3}
        />

        <div class="create-deck-form__row">
          <Select
            name="targetLanguage"
            label="Target Language"
            options={LANGUAGES}
            error={errors().targetLanguage}
            required
          />

          <Select
            name="nativeLanguage"
            label="Native Language"
            options={LANGUAGES}
            error={errors().nativeLanguage}
            required
          />
        </div>

        <div class="create-deck-form__row">
          <Select name="stage" label="Learning Stage" options={STAGES} />

          <Input
            name="newCardsPerDay"
            label="New Cards Per Day"
            type="number"
            min={1}
            max={100}
            value={20}
          />
        </div>

        <ModalActions>
          <Button type="button" variant="secondary" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading()}>
            Create Deck
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
