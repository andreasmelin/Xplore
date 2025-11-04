import Link from "next/link";

export default function HomeButton() {
  return (
    <Link
      href="/"
      className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg transition-colors"
      aria-label="Hem"
      title="Tillbaka till startsidan"
    >
      <span className="text-4xl">🏠</span>
    </Link>
  );
}

