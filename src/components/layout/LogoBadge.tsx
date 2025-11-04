import Image from "next/image";

export default function LogoBadge() {
  return (
    <div className="flex items-center justify-center mb-6">
      <Image
        src="/logos/sinus-logo-1024px.png"
        alt="Sinus"
        width={64}
        height={64}
        className="h-16 w-16 rounded-xl object-cover shadow-lg"
      />
    </div>
  );
}

