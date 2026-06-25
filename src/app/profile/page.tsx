import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { UserAvatar } from "@/components/user-avatar";
import { buttonVariants } from "@/components/ui/button";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const name = session.user.name ?? session.user.email ?? "DevStash user";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-2xl shadow-black/20">
        <div className="flex items-center gap-4">
          <UserAvatar
            className="size-12 rounded-xl"
            image={session.user.image}
            name={name}
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-normal">
              {name}
            </h1>
            {session.user.email && (
              <p className="truncate text-sm text-muted-foreground">
                {session.user.email}
              </p>
            )}
          </div>
        </div>
        <Link
          className={buttonVariants({
            className: "mt-6 w-full",
            variant: "outline",
          })}
          href="/dashboard"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
