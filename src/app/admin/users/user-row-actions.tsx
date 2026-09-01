"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { setUserRole, setUserSuspended } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import type { UserRole } from "@/lib/supabase/types";

export function UserRowActions({
  userId,
  name,
  role,
  suspended,
  isSelf,
}: {
  userId: string;
  name: string;
  role: UserRole;
  suspended: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<"role" | "suspend" | null>(null);

  if (isSelf) {
    return <span className="text-xs text-muted">That&apos;s you</span>;
  }

  async function changeRole() {
    setPending(true);
    const result = await setUserRole(userId, role === "admin" ? "student" : "admin");
    setPending(false);
    setDialog(null);

    if (!result.ok) return toast("error", result.error);
    toast("success", role === "admin" ? "Admin access removed." : "Admin access granted.");
    router.refresh();
  }

  async function toggleSuspend() {
    setPending(true);
    const result = await setUserSuspended(userId, !suspended);
    setPending(false);
    setDialog(null);

    if (!result.ok) return toast("error", result.error);
    toast("success", suspended ? "Account reinstated." : "Account suspended.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setDialog("role")} disabled={pending}>
        {role === "admin" ? "Remove admin" : "Make admin"}
      </Button>
      <Button
        variant={suspended ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setDialog("suspend")}
        disabled={pending}
      >
        {suspended ? "Reinstate" : "Suspend"}
      </Button>

      <ConfirmDialog
        open={dialog === "role"}
        title={role === "admin" ? `Remove admin access from ${name}?` : `Make ${name} an admin?`}
        description={
          role === "admin"
            ? "They will lose access to the admin panel immediately, and keep their student access."
            : "Admins can manage all courses, webinars, users, orders and payments, and approve UPI payments. Grant this only to people you trust."
        }
        confirmLabel={role === "admin" ? "Remove admin" : "Grant admin"}
        destructive={role !== "admin"}
        loading={pending}
        onConfirm={changeRole}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "suspend"}
        title={suspended ? `Reinstate ${name}?` : `Suspend ${name}?`}
        description={
          suspended
            ? "They will be able to use their account normally again."
            : "They keep their account and purchases, but lose admin rights while suspended."
        }
        confirmLabel={suspended ? "Reinstate account" : "Suspend account"}
        destructive={!suspended}
        loading={pending}
        onConfirm={toggleSuspend}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
