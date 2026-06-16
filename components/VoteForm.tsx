"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { castVote, type VoteResult } from "@/app/actions";
import { Icon } from "./Icon";

type Option = { id: number; label: string; count: number };

export function VoteForm({
  voteId,
  options,
  totalVotes,
  votedOptionId,
  closed,
}: {
  voteId: number;
  options: Option[];
  totalVotes: number;
  votedOptionId: number | null;
  closed: boolean;
}) {
  const [state, formAction] = useActionState<VoteResult, FormData>(castVote, null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(votedOptionId != null);

  useEffect(() => {
    if (state?.ok) setHasVoted(true);
  }, [state]);

  const showResult = hasVoted || closed;

  if (showResult) {
    return (
      <div className="space-y-2">
        {options.map((o) => {
          const pct = totalVotes ? Math.round((o.count / totalVotes) * 100) : 0;
          const mine = o.id === votedOptionId;
          return (
            <div key={o.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span className={`font-medium ${mine ? "text-pelican-700" : "text-ink"}`}>
                  {o.label} {mine && "• pilihan Anda"}
                </span>
                <span className="text-ink-faint">
                  {o.count} ({pct}%)
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/5">
                <div
                  className={`h-full rounded-full ${mine ? "bg-pelican-600" : "bg-pelican-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-ink-faint">
          {closed && !hasVoted ? "Voting telah ditutup." : "Terima kasih atas partisipasi Anda."}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="voteId" value={voteId} />
      <input type="hidden" name="optionId" value={selected ?? ""} />
      {options.map((o) => {
        const active = selected === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelected(o.id)}
            className={`flex w-full items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
              active
                ? "border-pelican-400 bg-pelican-50 text-pelican-700"
                : "border-black/5 bg-white text-ink"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                active ? "border-pelican-500 bg-pelican-500 text-white" : "border-black/15"
              }`}
            >
              {active && <Icon name="check" size={12} />}
            </span>
            {o.label}
          </button>
        );
      })}

      {state && !state.ok && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {state.message}
        </p>
      )}

      <SubmitButton disabled={selected == null} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn-primary mt-1 w-full disabled:opacity-50"
    >
      <Icon name="send" size={18} />
      {pending ? "Mengirim..." : "Kirim Suara"}
    </button>
  );
}
