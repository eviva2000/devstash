"use client";

import { signOut } from "next-auth/react";
import { KeyRound, Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ProfileAccountActions({
  canChangePassword,
}: {
  canChangePassword: boolean;
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPasswordPending, setIsPasswordPending] = useState(false);

  function openPasswordModal() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordMessage("");
    setIsPasswordModalOpen(true);
  }

  async function handlePasswordChange() {
    setPasswordError("");
    setPasswordMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    setIsPasswordPending(true);

    const response = await fetch("/api/profile/password", {
      body: JSON.stringify({
        confirmPassword,
        currentPassword,
        newPassword,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    setIsPasswordPending(false);

    if (!response.ok) {
      setPasswordError(await readError(response));
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password changed.");
  }

  async function handleDeleteAccount() {
    if (confirmation !== "DELETE") {
      setError("Type DELETE to confirm account deletion.");
      return;
    }

    setError("");
    setIsDeleting(true);

    const response = await fetch("/api/profile/account", {
      method: "DELETE",
    });

    if (!response.ok) {
      setIsDeleting(false);
      setError("Unable to delete your account. Try again.");
      return;
    }

    await signOut({ callbackUrl: "/sign-in" });
  }

  return (
    <>
      <section className="rounded-md border border-border bg-card p-5 text-card-foreground">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold tracking-normal">
              Account actions
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage sign-in and account removal.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {canChangePassword && (
              <Button
                onClick={openPasswordModal}
                type="button"
                variant="outline"
              >
                <KeyRound data-icon="inline-start" />
                Change password
              </Button>
            )}
            <Button
              onClick={() => {
                setConfirmation("");
                setError("");
                setIsConfirmOpen(true);
              }}
              type="button"
              variant="destructive"
            >
              <Trash2 data-icon="inline-start" />
              Delete account
            </Button>
          </div>
        </div>
      </section>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
          <div
            aria-labelledby="change-password-title"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <KeyRound className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <h2
                  className="text-base font-semibold tracking-normal"
                  id="change-password-title"
                >
                  Change password
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter your current password and choose a new one.
                </p>
              </div>
              <Button
                aria-label="Close"
                disabled={isPasswordPending}
                onClick={() => setIsPasswordModalOpen(false)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handlePasswordChange();
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="current-password">
                  Current password
                </label>
                <Input
                  autoComplete="current-password"
                  disabled={isPasswordPending}
                  id="current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  type="password"
                  value={currentPassword}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="new-password">
                  New password
                </label>
                <Input
                  autoComplete="new-password"
                  disabled={isPasswordPending}
                  id="new-password"
                  minLength={8}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type="password"
                  value={newPassword}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="confirm-password">
                  Confirm new password
                </label>
                <Input
                  autoComplete="new-password"
                  disabled={isPasswordPending}
                  id="confirm-password"
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </div>

              {passwordMessage && (
                <p
                  aria-live="polite"
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
                >
                  {passwordMessage}
                </p>
              )}
              {passwordError && (
                <p
                  aria-live="polite"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {passwordError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button
                  disabled={isPasswordPending}
                  onClick={() => setIsPasswordModalOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  className={cn(isPasswordPending && "gap-2")}
                  disabled={isPasswordPending}
                  type="submit"
                >
                  {isPasswordPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <KeyRound />
                  )}
                  Save password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
          <div
            aria-labelledby="delete-account-title"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <h2
                  className="text-base font-semibold tracking-normal"
                  id="delete-account-title"
                >
                  Delete account
                </h2>
                <p className="text-sm text-muted-foreground">
                  This permanently removes your profile, items, collections,
                  and sign-in data.
                </p>
              </div>
              <Button
                aria-label="Close"
                disabled={isDeleting}
                onClick={() => setIsConfirmOpen(false)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>

            <div className="mt-5 space-y-2">
              <label className="text-sm font-medium" htmlFor="delete-confirm">
                Type DELETE to confirm
              </label>
              <Input
                autoComplete="off"
                disabled={isDeleting}
                id="delete-confirm"
                onChange={(event) => setConfirmation(event.target.value)}
                value={confirmation}
              />
            </div>

            {error && (
              <p
                aria-live="polite"
                className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                disabled={isDeleting}
                onClick={() => setIsConfirmOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className={cn(isDeleting && "gap-2")}
                disabled={isDeleting || confirmation !== "DELETE"}
                onClick={handleDeleteAccount}
                type="button"
                variant="destructive"
              >
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

async function readError(response: Response) {
  const body: unknown = await response.json().catch(() => null);

  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "string"
  ) {
    return body.error;
  }

  return "Unable to change password. Try again.";
}
