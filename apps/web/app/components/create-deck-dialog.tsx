import { useFetcher } from "react-router";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";

export function CreateDeckDialog() {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button />}>New Deck</AlertDialogTrigger>
      <AlertDialogContent>
        <fetcher.Form
          method="post"
          action="/?index"
          onSubmit={() => setOpen(false)}
        >
          <input type="hidden" name="intent" value="create-deck" />
          <AlertDialogHeader>
            <AlertDialogTitle>Create Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Set up a new vocabulary deck for language learning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="deck-name" className="text-sm font-medium">Name</label>
              <input
                id="deck-name"
                name="name"
                required
                placeholder="French Vocabulary"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="deck-target-lang" className="text-sm font-medium">Target Language</label>
                <input
                  id="deck-target-lang"
                  name="targetLanguage"
                  required
                  placeholder="fr"
                  maxLength={5}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="deck-native-lang" className="text-sm font-medium">Native Language</label>
                <input
                  id="deck-native-lang"
                  name="nativeLanguage"
                  required
                  placeholder="en"
                  maxLength={5}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="deck-description" className="text-sm font-medium">Description</label>
              <input
                id="deck-description"
                name="description"
                placeholder="Optional description"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction type="submit">Create</AlertDialogAction>
          </AlertDialogFooter>
        </fetcher.Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
