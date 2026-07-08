"use client";

import { FolderOpen, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";

import { createCollection } from "@/actions/collections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getActionErrorMessage } from "@/lib/utils";

type CreateCollectionFormState = {
  name: string;
  description: string;
};

const initialForm: CreateCollectionFormState = {
  name: "",
  description: "",
};

export function CollectionCreateDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateCollectionFormState>(initialForm);
  const [formError, setFormError] = useState("");
  const isSubmitDisabled = isSaving || form.name.trim().length === 0;

  function updateForm(patch: Partial<CreateCollectionFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function openDialog() {
    setForm(initialForm);
    setFormError("");
    setIsSaving(false);
    setIsOpen(true);
  }

  function closeDialog() {
    setIsOpen(false);
    setForm(initialForm);
    setFormError("");
    setIsSaving(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");

    let result: Awaited<ReturnType<typeof createCollection>>;
    try {
      result = await createCollection({
        name: form.name,
        description: form.description,
      });
    } catch (error) {
      console.error("Failed to create collection.", error);
      result = {
        success: false,
        error: getActionErrorMessage(
          error,
          "Unable to create collection. Try again."
        ),
      };
    } finally {
      setIsSaving(false);
    }

    if (!result.success) {
      setFormError(result.error);
      toast.error(result.error);
      return;
    }

    toast.success("Collection created.");
    closeDialog();
    router.refresh();
  }

  return (
    <>
      <Button
        className="ml-auto hidden sm:inline-flex"
        onClick={openDialog}
        type="button"
        variant="outline"
      >
        <FolderOpen data-icon="inline-start" />
        New Collection
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (isSaving) {
            return;
          }
          if (open) {
            openDialog();
            return;
          }
          closeDialog();
        }}
      >
        <DialogContent className="max-w-lg" showCloseButton={!isSaving}>
          <form className="flex min-h-0 flex-col" onSubmit={handleSubmit}>
            <div className="shrink-0 px-5 pb-3 pt-5">
              <DialogHeader className="pr-8">
                <DialogTitle>Create Collection</DialogTitle>
                <DialogDescription className="sr-only">
                  Create a new collection.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-5 pb-5">
              <div className="space-y-4">
                {formError && (
                  <p
                    aria-live="polite"
                    className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    {formError}
                  </p>
                )}

                <section className="grid gap-3">
                  <CreateField label="Name" required>
                    <Input
                      autoFocus
                      disabled={isSaving}
                      maxLength={100}
                      onChange={(event) =>
                        updateForm({ name: event.target.value })
                      }
                      required
                      value={form.name}
                    />
                  </CreateField>

                  <CreateField label="Description">
                    <CreateTextarea
                      disabled={isSaving}
                      maxLength={500}
                      onChange={(description) => updateForm({ description })}
                      rows={3}
                      value={form.description}
                    />
                  </CreateField>
                </section>
              </div>
            </div>

            <DialogFooter className="p-3">
              <Button
                disabled={isSaving}
                onClick={closeDialog}
                type="button"
                variant="outline"
              >
                <X />
                Cancel
              </Button>
              <Button disabled={isSubmitDisabled} type="submit">
                {isSaving ? <Loader2 className="animate-spin" /> : <Plus />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateField({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
    </label>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-sm font-medium text-muted-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </span>
  );
}

function CreateTextarea({
  disabled,
  maxLength,
  onChange,
  rows,
  value,
}: {
  disabled: boolean;
  maxLength: number;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <textarea
      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      value={value}
    />
  );
}
