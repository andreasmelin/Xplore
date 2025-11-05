"use client";

type Feature = {
  icon: string;
  title: string;
  description: string;
  gradient: string;
};

const features: Feature[] = [
  {
    icon: "💬",
    title: "Prata med Sinus",
    description: "Ställ frågor och utforska ämnen genom samtal med din personliga AI-lärare",
    gradient: "from-cyan-500 via-blue-500 to-purple-600",
  },
  {
    icon: "✍️",
    title: "Lär dig bokstäver",
    description: "Öva på att skriva bokstäver med regnbågsfärger och roliga animationer",
    gradient: "from-red-500 via-yellow-500 to-pink-500",
  },
  {
    icon: "🔍",
    title: "Utforska ämnen",
    description: "Upptäck nya ämnen med interaktiva lektioner och visuella hjälpmedel",
    gradient: "from-green-500 via-emerald-500 to-teal-500",
  },
  {
    icon: "🔢",
    title: "Matematik",
    description: "Lär dig räkna och lösa problem på ett roligt och lekfullt sätt",
    gradient: "from-amber-500 via-yellow-500 to-lime-500",
  },
];

export default function FeatureHighlights() {
  return (
    <div className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Allt ditt barn behöver för att lära sig
          </h2>
          <p className="text-xl text-indigo-100/80 max-w-2xl mx-auto">
            Fyra olika sätt att lära sig - alla anpassade efter barnets ålder och intresse
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] animate-in slide-in-from-bottom duration-700"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-80 group-hover:opacity-100 transition-opacity duration-300`}
              />

              {/* Content */}
              <div className="relative z-10 p-8 flex flex-col items-center text-center min-h-[280px]">
                {/* Icon */}
                <div className="text-7xl mb-4 transform transition-transform duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-white/90 drop-shadow-md">
                  {feature.description}
                </p>

                {/* Hover indicator */}
                <div className="mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-white text-sm font-semibold flex items-center gap-2">
                    Upptäck mer
                    <span className="text-lg">→</span>
                  </div>
                </div>
              </div>

              {/* Animated border glow */}
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute inset-0 rounded-3xl border-2 border-white/30 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <div className="mt-12 text-center">
          <p className="text-indigo-100/70 text-lg">
            Och mycket mer på väg! 🚀
          </p>
        </div>
      </div>
    </div>
  );
}
