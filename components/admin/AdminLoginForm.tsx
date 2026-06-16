"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { adminLogin, type LoginState } from "@/app/admin/actions";

export function AdminLoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    adminLogin,
    null
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Username
        </label>
        <input
          name="username"
          required
          autoComplete="username"
          placeholder="admin"
          className="input"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Kata Sandi
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="input"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Memproses..." : "Masuk"}
    </button>
  );
}
