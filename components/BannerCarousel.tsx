"use client";

import { useEffect, useRef, useState } from "react";

export type BannerData = {
  id: number;
  image: string;
};

export function BannerCarousel({ banners }: { banners: BannerData[] }) {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    timer.current = setInterval(() => {
      setActive((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="px-5">
      <div className="relative overflow-hidden rounded-3xl bg-pelican-50">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {banners.map((b) => (
            <div key={b.id} className="min-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image}
                alt="Banner Puri Pelican"
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      {banners.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setActive(i)}
              aria-label={`Banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-pelican-600" : "w-1.5 bg-pelican-200"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
