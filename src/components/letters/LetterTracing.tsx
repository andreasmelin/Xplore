"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getLetterStrokes } from "./letterData";

type LetterTracingProps = {
  letter: string;
  onBack: () => void;
  onNext: () => void;
  initialSoundEnabled?: boolean;
  initialVolume?: number;
  onSoundSettingsChange?: (enabled: boolean, volume: number) => void;
};

export default function LetterTracing({ 
  letter, 
  onBack, 
  onNext,
  initialSoundEnabled = true,
  initialVolume = 0.7,
  onSoundSettingsChange
}: LetterTracingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(0);
  const [strokeProgress, setStrokeProgress] = useState<number[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(initialSoundEnabled);
  const [volume, setVolume] = useState(initialVolume);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);

  const strokes = getLetterStrokes(letter);
  
  // Notify parent of sound settings changes
  useEffect(() => {
    if (onSoundSettingsChange) {
      onSoundSettingsChange(isSoundEnabled, volume);
    }
  }, [isSoundEnabled, volume, onSoundSettingsChange]);

  // Initialize stroke progress
  useEffect(() => {
    setStrokeProgress(strokes.map(() => 0));
    setCurrentStroke(0);
    setIsComplete(false);
    setShowCelebration(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter]);

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw guide letter (light gray outline)
    ctx.strokeStyle = "rgba(200, 200, 200, 0.3)";
    ctx.lineWidth = 40;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    strokes.forEach((stroke) => {
      ctx.beginPath();
      stroke.points.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    });

    // Draw completed strokes with rainbow effect
    strokes.forEach((stroke, strokeIndex) => {
      const progress = strokeProgress[strokeIndex] || 0;
      if (progress === 0) return;

      const points = stroke.points;
      const numPoints = Math.floor(points.length * Math.min(progress, 1));

      if (numPoints < 2) return;

      // Draw rainbow gradient
      for (let i = 0; i < numPoints - 1; i++) {
        const t = i / points.length;
        const hue = (t * 360) % 360;
        
        ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.lineWidth = 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[i + 1].x, points[i + 1].y);
        ctx.stroke();
      }
    });

    // Draw start point indicator for current stroke
    if (currentStroke < strokes.length && strokeProgress[currentStroke] === 0) {
      const startPoint = strokes[currentStroke].points[0];
      
      // Pulsing green circle
      const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(0, 255, 0, ${pulse})`;
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 20, 0, Math.PI * 2);
      ctx.fill();

      // White center
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw direction arrow for current stroke
    if (currentStroke < strokes.length && strokeProgress[currentStroke] > 0 && strokeProgress[currentStroke] < 1) {
      const stroke = strokes[currentStroke];
      const progress = strokeProgress[currentStroke];
      const pointIndex = Math.floor(stroke.points.length * progress);
      
      if (pointIndex < stroke.points.length - 1) {
        const currentPoint = stroke.points[pointIndex];
        const nextPoint = stroke.points[pointIndex + 1];
        
        // Draw arrow
        const angle = Math.atan2(nextPoint.y - currentPoint.y, nextPoint.x - currentPoint.x);
        const arrowLength = 30;
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 4;
        
        // Arrow shaft
        ctx.beginPath();
        ctx.moveTo(currentPoint.x, currentPoint.y);
        ctx.lineTo(
          currentPoint.x + Math.cos(angle) * arrowLength,
          currentPoint.y + Math.sin(angle) * arrowLength
        );
        ctx.stroke();
        
        // Arrow head
        ctx.beginPath();
        const headX = currentPoint.x + Math.cos(angle) * arrowLength;
        const headY = currentPoint.y + Math.sin(angle) * arrowLength;
        ctx.moveTo(headX, headY);
        ctx.lineTo(
          headX - Math.cos(angle - Math.PI / 6) * 15,
          headY - Math.sin(angle - Math.PI / 6) * 15
        );
        ctx.lineTo(
          headX - Math.cos(angle + Math.PI / 6) * 15,
          headY - Math.sin(angle + Math.PI / 6) * 15
        );
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [strokes, strokeProgress, currentStroke]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Handle pointer down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isComplete) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check if starting near the current progress point of current stroke
    if (currentStroke < strokes.length) {
      const stroke = strokes[currentStroke];
      const currentProgress = strokeProgress[currentStroke];
      const currentPointIndex = Math.floor(stroke.points.length * currentProgress);
      
      // Check points near current progress (for resuming) or start point (for new stroke)
      const checkPoints = currentProgress === 0 
        ? [stroke.points[0]]  // Only check start for new strokes
        : stroke.points.slice(currentPointIndex, Math.min(currentPointIndex + 15, stroke.points.length)); // Check ahead for resume
      
      for (const point of checkPoints) {
        const distance = Math.sqrt(
          Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
        );

        if (distance < 80) {  // Generous tolerance for pickup
          setIsDrawing(true);
          break;
        }
      }
    }
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isComplete) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentStroke >= strokes.length) return;

    const stroke = strokes[currentStroke];
    const currentProgress = strokeProgress[currentStroke];
    const currentPointIndex = Math.floor(stroke.points.length * currentProgress);

    // Look ahead up to 10 points to find a match (helps if user missed a spot)
    let bestMatchIndex = -1;
    let bestMatchDistance = Infinity;
    const lookAheadCount = 10;
    
    for (let i = 0; i < lookAheadCount && currentPointIndex + i < stroke.points.length; i++) {
      const checkPoint = stroke.points[currentPointIndex + i];
      const distance = Math.sqrt(
        Math.pow(x - checkPoint.x, 2) + Math.pow(y - checkPoint.y, 2)
      );
      
      if (distance < 150 && distance < bestMatchDistance) {
        bestMatchDistance = distance;
        bestMatchIndex = currentPointIndex + i;
      }
    }

    // If we found a matching point ahead, jump to it
    if (bestMatchIndex >= 0) {
      const newProgress = Math.min((bestMatchIndex + 1) / stroke.points.length, 1);
      const newStrokeProgress = [...strokeProgress];
      newStrokeProgress[currentStroke] = newProgress;
      setStrokeProgress(newStrokeProgress);

      // Check if stroke is complete
      if (newProgress >= 1) {
        if (currentStroke === strokes.length - 1) {
          // All strokes complete!
          setIsComplete(true);
          setShowCelebration(true);
          setIsDrawing(false);
          
          // Play celebration sound
          playCelebrationSound();
          
          // Hide celebration after 3 seconds
          setTimeout(() => {
            setShowCelebration(false);
          }, 3000);
        } else {
          // Move to next stroke
          setCurrentStroke(currentStroke + 1);
          setIsDrawing(false);
        }
      }
    }
  };

  // Handle pointer up
  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const playCelebrationSound = async () => {
    if (!isSoundEnabled) return;
    
    try {
      const cheerPhrases = [
        "Hurra! Bra jobbat!",
        "Fantastiskt! Du är en stjärna!",
        "Perfekt! Så bra!",
        "Underbart! Fortsätt så!",
      ];
      const randomPhrase = cheerPhrases[Math.floor(Math.random() * cheerPhrases.length)];
      
      const response = await fetch("/api/tts-cached/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: randomPhrase,
          useCache: true 
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = volume;
        audio.play().catch(() => {
          // Ignore audio play errors (e.g., autoplay policy)
        });
        
        // Clean up the URL after playing
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      // Silently fail if TTS is unavailable
      console.log("Could not play celebration sound:", error);
    }
  };

  const handleReset = () => {
    setStrokeProgress(strokes.map(() => 0));
    setCurrentStroke(0);
    setIsComplete(false);
    setShowCelebration(false);
    setIsDrawing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500 flex flex-col">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors"
          >
            ← Tillbaka
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
            Bokstaven {letter}
          </h1>
          <div className="flex items-center gap-2">
            {/* Sound Control */}
            <div className="relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                onBlur={() => setTimeout(() => setShowVolumeSlider(false), 200)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span className="text-xl">
                  {isSoundEnabled ? (volume > 0.5 ? "🔊" : volume > 0 ? "🔉" : "🔈") : "🔇"}
                </span>
                <span className="hidden md:inline">Ljud</span>
              </button>
              
              {/* Volume Slider Popup */}
              {showVolumeSlider && (
                <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-4 z-50 min-w-[200px]">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Ljud</span>
                      <button
                        onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                        className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                          isSoundEnabled
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-700"
                        }`}
                      >
                        {isSoundEnabled ? "På" : "Av"}
                      </button>
                    </div>
                    
                    {isSoundEnabled && (
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-600">Volym</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-full accent-purple-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>🔈</span>
                          <span>{Math.round(volume * 100)}%</span>
                          <span>🔊</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors"
            >
              🔄 <span className="hidden md:inline">Börja om</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="bg-white/90 rounded-3xl shadow-2xl cursor-crosshair touch-none"
            style={{ maxWidth: "90vw", maxHeight: "60vh", width: "600px", height: "600px" }}
          />
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-3 text-white">
          {!isComplete && currentStroke < strokes.length && (
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold text-center">
                {strokeProgress[currentStroke] === 0
                  ? "Klicka på den gröna punkten och dra fingret längs bokstaven! 🌈"
                  : "Fortsätt rita längs bokstaven! Pilen visar vägen 👉"}
              </p>
              {strokeProgress[currentStroke] > 0 && strokeProgress[currentStroke] < 1 && (
                <p className="text-sm text-center text-white/80">
                  {isDrawing 
                    ? "Håll kvar fingret och följ pilen!"
                    : "Klicka var som helst på den vita pilen för att fortsätta"}
                </p>
              )}
            </div>
          )}
          {isComplete && (
            <p className="text-lg font-semibold text-center">
              Fantastiskt jobbat! 🎉 Tryck på Nästa för fler bokstäver!
            </p>
          )}
        </div>

        {/* Next Button */}
        {isComplete && (
          <button
            onClick={onNext}
            className="mt-4 px-8 py-4 bg-green-500 hover:bg-green-400 text-white text-xl font-bold rounded-full shadow-lg transition-all transform hover:scale-105"
          >
            Nästa bokstav →
          </button>
        )}

        {/* Celebration Overlay */}
        {showCelebration && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="animate-bounce">
              <div className="text-9xl">🎉</div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-6xl animate-ping"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${1 + Math.random()}s`,
                  }}
                >
                  {["🌈", "⭐", "✨", "🎊", "🎈"][Math.floor(Math.random() * 5)]}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

