"use client";

import {
  Edit3,
  Loader2,
  MoreHorizontal,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  deleteCollection,
  updateCollection,
} from "@/actions/collections";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DashboardCollection } from "@/features/dashboard/dashboard-types";
import { getActionErrorMessage } from "@/lib/utils";

type CollectionMetadata = Pick<
  DashboardCollection,
  "id" | "name" | "isFavorite"
> & {
  description?: string | null;
};

type EditFormState = {
  name: string;
  description: string;
};

export function CollectionActionButtons({
  collection,
  onDeleted,
}: {
  collection: CollectionMetadata;
  onDeleted?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button aria-label="Favorite collection" type="button" variant="outline">
        <Star
          className={
            collection.isFavorite ? "fill-amber-400 text-amber-400" : undefined
          }
        />
        Favorite
      </Button>
      <CollectionEditDialog collection={collection}>
        {(openDialog) => (
          <Button onClick={openDialog} type="button" variant="outline">
            <Edit3 />
            Edit
          </Button>
        )}
      </CollectionEditDialog>
      <CollectionDeleteDialog collection={collection} onDeleted={onDeleted}>
        {(openDialog) => (
          <Button onClick={openDialog} type="button" variant="destructive">
            <Trash2 />
            Delete
          </Button>
        )}
      </CollectionDeleteDialog>
    </div>
  );
}

export function CollectionActionsMenu({
  collection,
}: {
  collection: CollectionMetadata;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  function stopCardNavigation(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          aria-label={`Open actions for ${collection.name}`}
          render={
            <Button
              onClick={stopCardNavigation}
              onKeyDown={stopCardNavigation}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <PopoverContent
          className="w-44 p-1"
          onClick={stopCardNavigation}
        >
          <div className="grid gap-1" role="menu">
            <MenuButton
              icon={Edit3}
              label="Edit"
              onClick={() => {
                setIsOpen(false);
                setIsEditDialogOpen(true);
              }}
            />

            <MenuButton
              icon={Star}
              label="Favorite"
              onClick={() => setIsOpen(false)}
            />

            <MenuButton
              destructive
              icon={Trash2}
              label="Delete"
              onClick={() => {
                setIsOpen(false);
                setIsDeleteDialogOpen(true);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      <CollectionEditDialog
        collection={collection}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
      <CollectionDeleteDialog
        collection={collection}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
}

function CollectionEditDialog({
  children,
  collection,
  onOpenChange,
  open,
}: {
  children?: (openDialog: () => void) => React.ReactNode;
  collection: CollectionMetadata;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<EditFormState>(() =>
    getInitialForm(collection)
  );
  const isSubmitDisabled = isSaving || form.name.trim().length === 0;
  const isOpen = open ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
  }

  function updateForm(patch: Partial<EditFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function openDialog() {
    setForm(getInitialForm(collection));
    setFormError("");
    setIsSaving(false);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setForm(getInitialForm(collection));
    setFormError("");
    setIsSaving(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");

    let result: Awaited<ReturnType<typeof updateCollection>>;
    try {
      result = await updateCollection(collection.id, {
        name: form.name,
        description: form.description,
      });
    } catch (error) {
      console.error("Failed to update collection.", error);
      result = {
        success: false,
        error: getActionErrorMessage(
          error,
          "Unable to update collection. Try again."
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

    toast.success("Collection saved.");
    closeDialog();
    router.refresh();
  }

  return (
    <>
      {children?.(openDialog)}
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
                <DialogTitle>Edit Collection</DialogTitle>
                <DialogDescription className="sr-only">
                  Edit collection metadata.
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
                  <EditField label="Name" required>
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
                  </EditField>

                  <EditField label="Description">
                    <EditTextarea
                      disabled={isSaving}
                      maxLength={500}
                      onChange={(description) => updateForm({ description })}
                      rows={3}
                      value={form.description}
                    />
                  </EditField>
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
                {isSaving ? <Loader2 className="animate-spin" /> : <Edit3 />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CollectionDeleteDialog({
  children,
  collection,
  onDeleted,
  onOpenChange,
  open,
}: {
  children?: (openDialog: () => void) => React.ReactNode;
  collection: CollectionMetadata;
  onDeleted?: () => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isOpen = open ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    let result: Awaited<ReturnType<typeof deleteCollection>>;
    try {
      result = await deleteCollection(collection.id);
    } catch (error) {
      console.error("Failed to delete collection.", error);
      result = {
        success: false,
        error: getActionErrorMessage(
          error,
          "Unable to delete collection. Try again."
        ),
      };
    } finally {
      setIsDeleting(false);
    }

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Collection deleted.");
    setOpen(false);
    if (onDeleted) {
      onDeleted();
      return;
    }
    router.refresh();
  }

  return (
    <>
      {children?.(() => setOpen(true))}
      <AlertDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &ldquo;{collection.name}&rdquo; from your
              collections. Items in it will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
              type="button"
              variant="destructive"
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MenuButton({
  destructive = false,
  icon: Icon,
  label,
  onClick,
}: {
  destructive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
        destructive ? "text-destructive" : "text-popover-foreground"
      }`}
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  );
}

function EditField({
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
      <span className="text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

function EditTextarea({
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

function getInitialForm(collection: CollectionMetadata): EditFormState {
  return {
    name: collection.name,
    description: collection.description ?? "",
  };
}
