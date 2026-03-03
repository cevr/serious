import { useFetcher } from "react-router";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function CreateDeckDialog() {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New Deck</DialogTrigger>
      <DialogContent>
        <fetcher.Form
          method="post"
          action="/?index"
          onSubmit={() => setOpen(false)}
        >
          <input type="hidden" name="intent" value="create-deck" />
          <DialogHeader>
            <DialogTitle>Create Deck</DialogTitle>
            <DialogDescription>
              Set up a new vocabulary deck for language learning.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="deck-name" className="text-sm font-medium">Name</label>
              <Input
                id="deck-name"
                name="name"
                required
                placeholder="French Vocabulary"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="deck-target-lang" className="text-sm font-medium">Target Language</label>
                <Input
                  id="deck-target-lang"
                  name="targetLanguage"
                  required
                  placeholder="fr"
                  maxLength={5}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="deck-native-lang" className="text-sm font-medium">Native Language</label>
                <Input
                  id="deck-native-lang"
                  name="nativeLanguage"
                  required
                  placeholder="en"
                  maxLength={5}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label htmlFor="deck-description" className="text-sm font-medium">Description</label>
              <Input
                id="deck-description"
                name="description"
                placeholder="Optional description"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <DialogClose>Cancel</DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
