"use client";

import type { ReactNode } from "react";
import { useToast } from "./Toast";
import type { ActionResult } from "@/app/admin/actions";

export function ActionForm({
  action,
  onSuccess,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  onSuccess?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const { toast } = useToast();

  return (
    <form
      className={className}
      action={async (formData) => {
        try {
          const res = await action(formData);
          if (res && res.ok === false) {
            toast(res.message, "error");
            return;
          }
          toast(res?.message ?? "Berhasil disimpan.", "success");
          onSuccess?.();
        } catch {
          toast("Terjadi kesalahan. Coba lagi.", "error");
        }
      }}
    >
      {children}
    </form>
  );
}
