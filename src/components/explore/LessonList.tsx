"use client";

import { Topic, Lesson } from "@/lib/explore/topics-data";

type LessonListProps = {
  topic: Topic;
  onSelectLesson: (lesson: Lesson) => void;
  onBack: () => void;
};

const difficultyColors = {
  easy: "bg-green-500/20 text-green-300 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-300 border-red-500/30",
};

const difficultyLabels = {
  easy: "Lätt",
  medium: "Medel",
  hard: "Svår",
};

export default function LessonList({ topic, onSelectLesson, onBack }: LessonListProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-indigo-100/80 hover:text-indigo-100 mb-4 transition-colors text-sm"
        >
          <span>←</span>
          <span>Tillbaka till ämnen</span>
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="text-6xl">{topic.icon}</div>
          <div>
            <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-xs font-medium text-indigo-100/80 mb-2">
              {topic.category}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {topic.title}
            </h2>
            <p className="text-indigo-100/80">
              {topic.description}
            </p>
          </div>
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topic.lessons.map((lesson, index) => (
          <button
            key={lesson.id}
            onClick={() => onSelectLesson(lesson)}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm shadow-lg transition-all duration-300 hover:scale-102 hover:shadow-xl text-left p-6"
          >
            {/* Lesson Number Badge */}
            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-sm w-10 h-10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{index + 1}</span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-white mb-2 pr-12">
              {lesson.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-indigo-100/70 mb-4">
              {lesson.description}
            </p>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Difficulty */}
              <span className={`text-xs px-3 py-1 rounded-full border ${difficultyColors[lesson.difficulty]}`}>
                {difficultyLabels[lesson.difficulty]}
              </span>

              {/* Duration */}
              <span className="text-xs text-indigo-100/60 flex items-center gap-1">
                <span>⏱️</span>
                <span>{lesson.estimatedMinutes} min</span>
              </span>

              {/* Content Count */}
              <span className="text-xs text-indigo-100/60 flex items-center gap-1">
                <span>📄</span>
                <span>{lesson.content.length} delar</span>
              </span>
            </div>

            {/* Hover Arrow */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-white">→</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}










