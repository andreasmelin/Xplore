"use client";

import { Topic } from "@/lib/explore/topics-data";

type TopicBrowserProps = {
  topics: Topic[];
  onSelectTopic: (topic: Topic) => void;
};

export default function TopicBrowser({ topics, onSelectTopic }: TopicBrowserProps) {
  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic)}
            className="group relative overflow-hidden rounded-2xl border border-white/10 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 text-left"
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${topic.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
            
            {/* Content */}
            <div className="relative z-10 p-6">
              {/* Icon */}
              <div className="text-6xl mb-3 transform transition-transform group-hover:scale-110">
                {topic.icon}
              </div>

              {/* Category Badge */}
              <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white mb-3">
                {topic.category}
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                {topic.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-white/90 drop-shadow-md mb-3">
                {topic.description}
              </p>

              {/* Lesson Count */}
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <span>📚</span>
                <span>{topic.lessons.length} {topic.lessons.length === 1 ? 'lektion' : 'lektioner'}</span>
              </div>

              {/* Hover Arrow */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-white text-2xl">→</div>
              </div>
            </div>

            {/* Animated Border */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="absolute inset-0 rounded-2xl border-2 border-white/30" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

