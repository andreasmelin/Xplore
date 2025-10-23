"use client";

import Link from "next/link";
import { ReactNode } from "react";

type ModeCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  gradient: string;
  comingSoon?: boolean;
};

export default function ModeCard({
  title,
  description,
  icon,
  href,
  gradient,
  comingSoon = false,
}: ModeCardProps) {
  const card = (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-300 ${
        comingSoon
          ? "opacity-40 cursor-not-allowed blur-[2px]"
          : "hover:scale-105 hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] cursor-pointer"
      }`}
    >
      {/* Gradient Background */}
      <div
        className={`absolute inset-0 ${gradient} ${
          comingSoon ? "opacity-50" : "opacity-80"
        } ${
          !comingSoon && "group-hover:opacity-100"
        } transition-opacity duration-300`}
      />

      {/* Coming Soon Overlay */}
      {comingSoon && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-5" />
      )}

      {/* Content */}
      <div className="relative z-10 p-8 flex flex-col items-center text-center min-h-[280px]">
        {/* Icon */}
        <div className="text-7xl mb-4 transform transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
          {title}
        </h2>

        {/* Description */}
        <p className="text-sm text-white/90 drop-shadow-md mb-4">
          {description}
        </p>

        {/* Coming Soon Badge */}
        {comingSoon && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            Kommer snart
          </div>
        )}

        {/* Hover indicator */}
        {!comingSoon && (
          <div className="mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-white text-sm font-semibold flex items-center gap-2">
              Klicka för att börja
              <span className="text-lg">→</span>
            </div>
          </div>
        )}
      </div>

      {/* Animated border glow */}
      {!comingSoon && (
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 rounded-3xl border-2 border-white/30 animate-pulse" />
        </div>
      )}
    </div>
  );

  if (comingSoon) {
    return card;
  }

  return <Link href={href}>{card}</Link>;
}

