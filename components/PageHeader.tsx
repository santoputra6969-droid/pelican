"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-pelican-700 to-pelican-600 px-5 pb-6 pt-[max(env(safe-area-inset-top),1rem)] text-white">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition active:scale-90"
        >
          <Icon name="arrow-left" size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-sm text-white/70">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
