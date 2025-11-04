"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getCharacterStrokes } from "./letterData";
import { logLetterPractice } from "@/lib/activity-logger";

type SentenceTracingProps = {
  sentence: string;
  onBack: () => void;
  onComplete: () => void;
  initialSoundEnabled?: boolean;
  initialVolume?: number;
  onSoundSettingsChange?: (enabled: boolean, volume: number) => void;
  profileId?: string;
};

// Constants for handwriting-like appearance
const LETTER_HEIGHT = 180; // Height of each letter area
const LETTER_WIDTH = 120; // Width for each letter (closer together)
const LETTER_SPACING = 2; // Small gap between letters within a word (reduced from 5)
const WORD_GAP = 40; // Gap between words
const CANVAS_HEIGHT = 460; // Height of word canvas
const CANVAS_PADDING = 15; // Padding around letters

// Guide line positions - matched to actual letter rendering
// Letters are scaled 0.4 and centered at MIDDLE_LINE_Y
// Original 600x600 letters span ~150-450, scaled to 0.4 = 120px tall
const MIDDLE_LINE_Y = 290; // Center point for letters
const LETTER_HALF_HEIGHT = 60; // Half of scaled letter height (300 * 0.4 / 2)
const TOP_LINE_Y = MIDDLE_LINE_Y - LETTER_HALF_HEIGHT;    // 230 - Top of letters
const BOTTOM_LINE_Y = MIDDLE_LINE_Y + LETTER_HALF_HEIGHT; // 350 - Bottom of letters

type Word = {
  chars: string[];
  charIndices: number[]; // Original indices in sentence
  canvasWidth: number;
};

export default function SentenceTracing({
  sentence,
  onBack,
  onComplete,
  initialSoundEnabled = true,
  initialVolume = 0.7,
  onSoundSettingsChange,
  profileId,
}: SentenceTracingProps) {
  const characters = sentence.split("");
  const traceableChars = characters.filter((char) => char !== " " && char !== "\u00A0");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set());
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(initialSoundEnabled);
  const [volume, setVolume] = useState(initialVolume);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map()); // wordIndex -> canvas
  const strokeProgressRef = useRef<Map<number, number[]>>(new Map()); // charIndex -> stroke progress
  const currentStrokeRef = useRef<Map<number, number>>(new Map()); // charIndex -> current stroke
  const isDrawingRef = useRef<Map<number, boolean>>(new Map()); // charIndex -> is drawing
  const startTimeRef = useRef<number>(Date.now());
  const lastUpdateRef = useRef<number>(0);
  const completedWordsRef = useRef<Set<number>>(new Set()); // Track completed words for TTS
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Debug logging for sentence tracing
  const [sentenceDebugLogs, setSentenceDebugLogs] = useState<string[]>([]);
  const [showSentenceDebug, setShowSentenceDebug] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  const addSentenceDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setSentenceDebugLogs(prev => {
      const newLogs = [...prev, logEntry];
      return newLogs.length > 50 ? newLogs.slice(-50) : newLogs;
    });
  };

  // Force unmute function with Web Audio API focus
  function forceUnmute() {
    try {
      addSentenceDebugLog('🔊 FORCE_UNMUTE: Starting sentence tracing force unmute');

      if (typeof window !== 'undefined') {
        // Detect device/browser
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        addSentenceDebugLog(`📱 Device: ${isIOS ? 'iOS' : 'Other'}, Browser: ${isSafari ? 'Safari' : 'Other'}`);

        // Step 1: Create and resume AudioContext
        if (!audioCtxRef.current) {
          try {
            const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
            const Ctor = w.webkitAudioContext ?? window.AudioContext;
            if (Ctor) {
              audioCtxRef.current = new Ctor();
              addSentenceDebugLog(`🎵 AudioContext created: ${Ctor.name}`);
            } else {
              addSentenceDebugLog('❌ No AudioContext constructor available');
            }
          } catch (error) {
            addSentenceDebugLog(`❌ AudioContext creation failed: ${error}`);
          }
        }

        const ctx = audioCtxRef.current;
        if (ctx) {
          addSentenceDebugLog(`🎚️ AudioContext state before: ${ctx.state}`);
          if (ctx.state !== 'running') {
            void ctx.resume().then(() => {
              addSentenceDebugLog('✅ AudioContext resumed successfully');
              setAudioUnlocked(true);
            }).catch((error) => {
              addSentenceDebugLog(`❌ AudioContext resume failed: ${error}`);
            });
          } else {
            addSentenceDebugLog('ℹ️ AudioContext already running');
            setAudioUnlocked(true);
          }

          // Step 2: Create silent oscillator to unlock Web Audio
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.00001;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.02);
            addSentenceDebugLog('🔇 Silent oscillator created and played');
          } catch (error) {
            addSentenceDebugLog(`❌ Silent oscillator failed: ${error}`);
          }
        }

        addSentenceDebugLog('✅ Force unmute process completed');
      } else {
        addSentenceDebugLog('❌ Window not available');
      }
    } catch (error) {
      addSentenceDebugLog(`❌ Force unmute error: ${error}`);
    }
  }

  // Play audio using Web Audio API for better iOS compatibility
  async function playAudioBuffer(audioBuffer: AudioBuffer) {
    if (!audioCtxRef.current) {
      addSentenceDebugLog('❌ No AudioContext available for Web Audio playback');
      return false;
    }

    try {
      const ctx = audioCtxRef.current;
      addSentenceDebugLog(`🎛️ Playing through Web Audio API, context state: ${ctx.state}`);

      if (ctx.state !== 'running') {
        await ctx.resume();
        addSentenceDebugLog('✅ AudioContext resumed for playback');
      }

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start(0);
      addSentenceDebugLog('▶️ Web Audio playback started successfully');

      return new Promise<boolean>((resolve) => {
        source.onended = () => {
          addSentenceDebugLog('✅ Web Audio playback completed');
          resolve(true);
        };
        source.onerror = (error) => {
          addSentenceDebugLog(`❌ Web Audio playback failed: ${error}`);
          resolve(false);
        };
      });
    } catch (error) {
      addSentenceDebugLog(`❌ Web Audio playback error: ${error}`);
      return false;
    }
  }

  // Parse sentence into words
  const words: Word[] = [];
  let currentWord: string[] = [];
  let currentWordIndices: number[] = [];
  let charIndex = 0;

  characters.forEach((char, index) => {
    if (char === " " || char === "\u00A0") {
      if (currentWord.length > 0) {
        words.push({
          chars: [...currentWord],
          charIndices: [...currentWordIndices],
          canvasWidth: currentWord.length * (LETTER_WIDTH + LETTER_SPACING) - LETTER_SPACING + CANVAS_PADDING * 2, // Remove last spacing, add padding
        });
        currentWord = [];
        currentWordIndices = [];
      }
    } else {
      currentWord.push(char);
      currentWordIndices.push(index);
      charIndex++;
    }
  });

  if (currentWord.length > 0) {
    words.push({
      chars: [...currentWord],
      charIndices: [...currentWordIndices],
      canvasWidth: currentWord.length * (LETTER_WIDTH + LETTER_SPACING) - LETTER_SPACING + CANVAS_PADDING * 2, // Remove last spacing, add padding
    });
  }

  // Get current traceable character index
  // TTS functions
  const playWordTTS = async (wordIndex: number) => {
    addSentenceDebugLog(`🎤 WORD_TTS: Starting word ${wordIndex}, sound enabled: ${isSoundEnabled}`);
    if (!isSoundEnabled) {
      addSentenceDebugLog('🔇 Sound is disabled, skipping word TTS');
      return;
    }

    // Only force unmute if we haven't unlocked audio yet
    if (!audioUnlocked) {
      addSentenceDebugLog('🔊 Force unmute before word TTS (first time)');
      forceUnmute();
      // Add a small delay to allow unlocking to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      addSentenceDebugLog('ℹ️ Audio already unlocked, skipping force unmute');
    }

    try {
      const word = words[wordIndex];
      const wordText = word.chars.join('');
      addSentenceDebugLog(`📝 Playing word TTS: "${wordText}"`);

      addSentenceDebugLog('🌐 Making TTS API request...');
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: wordText,
          provider: 'elevenlabs',
          format: 'mp3',
        }),
      });

      addSentenceDebugLog(`📡 TTS API response: ${response.status} ${response.statusText}`);

      if (response.ok) {
        addSentenceDebugLog('✅ TTS API response OK, processing audio blob...');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        addSentenceDebugLog(`🎵 Audio blob created, size: ${blob.size} bytes`);

        // Try Web Audio API first (better for iOS), fallback to HTML Audio
        if (audioCtxRef.current && audioUnlocked) {
          addSentenceDebugLog('🎛️ Attempting Web Audio API playback...');
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            addSentenceDebugLog('✅ Audio decoded to AudioBuffer');

            const success = await playAudioBuffer(audioBuffer);
            if (success) {
              URL.revokeObjectURL(url);
              return; // Successfully played via Web Audio
            } else {
              addSentenceDebugLog('⚠️ Web Audio failed, falling back to HTML Audio');
            }
          } catch (error) {
            addSentenceDebugLog(`⚠️ Web Audio decode/playback failed: ${error}, falling back to HTML Audio`);
          }
        }

        // Fallback to HTML Audio element
        addSentenceDebugLog('🔊 Falling back to HTML Audio element');

        if (audioRef.current) {
          audioRef.current.pause();
          addSentenceDebugLog('⏸️ Previous audio paused');
        }

        const audio = new Audio(url);
        audio.volume = volume;
        audio.muted = false;
        try { audio.setAttribute('playsinline', 'true'); } catch {}

        audioRef.current = audio;

        addSentenceDebugLog(`🔊 HTML Audio element created with volume: ${volume}, unlocked: ${audioUnlocked}`);

        audio.onended = () => {
          addSentenceDebugLog('✅ Word audio playback completed');
          URL.revokeObjectURL(url);
        };

        audio.onerror = () => {
          addSentenceDebugLog('❌ Word audio playback error');
        };

        // Play immediately - we've already verified audio is unlocked
        addSentenceDebugLog('▶️ Attempting HTML Audio playback...');
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            addSentenceDebugLog('✅ Word audio started playing successfully');
            setAudioUnlocked(true);
          }).catch((error) => {
            addSentenceDebugLog(`❌ Word audio play prevented: ${error}`);
            if (error.name === 'NotAllowedError') {
              addSentenceDebugLog('🔒 iOS blocked HTML audio - user interaction required');
              setAudioUnlocked(false);
            }
          });
        } else {
          addSentenceDebugLog('⚠️ HTML Audio play returned undefined');
        }
      } else {
        addSentenceDebugLog(`❌ TTS API failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const playSentenceTTS = async () => {
    addSentenceDebugLog(`🎤 SENTENCE_TTS: Starting full sentence, sound enabled: ${isSoundEnabled}`);
    if (!isSoundEnabled) {
      addSentenceDebugLog('🔇 Sound is disabled, skipping sentence TTS');
      return;
    }

    // Only force unmute if we haven't unlocked audio yet
    if (!audioUnlocked) {
      addSentenceDebugLog('🔊 Force unmute before sentence TTS (first time)');
      forceUnmute();
      // Add a small delay to allow unlocking to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      addSentenceDebugLog('ℹ️ Audio already unlocked, skipping force unmute');
    }

    try {
      addSentenceDebugLog(`📝 Playing full sentence TTS: "${sentence}"`);

      addSentenceDebugLog('🌐 Making sentence TTS API request...');
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sentence,
          provider: 'elevenlabs',
          format: 'mp3',
        }),
      });

      addSentenceDebugLog(`📡 Sentence TTS API response: ${response.status} ${response.statusText}`);

      if (response.ok) {
        addSentenceDebugLog('✅ Sentence TTS API response OK, processing audio blob...');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        addSentenceDebugLog(`🎵 Sentence audio blob created, size: ${blob.size} bytes`);

        // Try Web Audio API first (better for iOS), fallback to HTML Audio
        if (audioCtxRef.current && audioUnlocked) {
          addSentenceDebugLog('🎛️ Attempting Web Audio API playback for sentence...');
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            addSentenceDebugLog('✅ Sentence audio decoded to AudioBuffer');

            const success = await playAudioBuffer(audioBuffer);
            if (success) {
              URL.revokeObjectURL(url);
              return; // Successfully played via Web Audio
            } else {
              addSentenceDebugLog('⚠️ Web Audio failed, falling back to HTML Audio');
            }
          } catch (error) {
            addSentenceDebugLog(`⚠️ Web Audio decode/playback failed: ${error}, falling back to HTML Audio`);
          }
        }

        // Fallback to HTML Audio element
        addSentenceDebugLog('🔊 Falling back to HTML Audio element for sentence');

        if (audioRef.current) {
          audioRef.current.pause();
          addSentenceDebugLog('⏸️ Previous sentence audio paused');
        }

        const audio = new Audio(url);
        audio.volume = volume;
        audio.muted = false;
        try { audio.setAttribute('playsinline', 'true'); } catch {}

        audioRef.current = audio;

        addSentenceDebugLog(`🔊 HTML Audio element created with volume: ${volume}, unlocked: ${audioUnlocked}`);

        audio.onended = () => {
          addSentenceDebugLog('✅ Sentence audio playback completed');
          URL.revokeObjectURL(url);
        };

        audio.onerror = () => {
          addSentenceDebugLog('❌ Sentence audio playback error');
        };

        // Play immediately - we've already verified audio is unlocked
        addSentenceDebugLog('▶️ Attempting HTML Audio playback for sentence...');
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            addSentenceDebugLog('✅ Sentence audio started playing successfully');
            setAudioUnlocked(true);
          }).catch((error) => {
            addSentenceDebugLog(`❌ Sentence audio play prevented: ${error}`);
            if (error.name === 'NotAllowedError') {
              addSentenceDebugLog('🔒 iOS blocked HTML sentence audio - user interaction required');
              setAudioUnlocked(false);
            }
          });
        } else {
          addSentenceDebugLog('⚠️ HTML Audio play returned undefined');
        }
      } else {
        addSentenceDebugLog(`❌ Sentence TTS API failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const getCurrentTraceableIndex = () => {
    let count = 0;
    for (let i = 0; i < characters.length; i++) {
      if (characters[i] !== " " && characters[i] !== "\u00A0") {
        if (count === currentIndex) return i;
        count++;
      }
    }
    return -1;
  };

  const currentCharIndex = getCurrentTraceableIndex();
  const isLastChar = currentIndex >= traceableChars.length - 1;

  // Initialize stroke progress for a character
  const initializeCharacter = useCallback((charIndex: number) => {
    const char = characters[charIndex];
    const strokes = getCharacterStrokes(char);
    if (!strokeProgressRef.current.has(charIndex)) {
      strokeProgressRef.current.set(charIndex, strokes.map(() => 0));
      currentStrokeRef.current.set(charIndex, 0);
      isDrawingRef.current.set(charIndex, false);
    }
  }, [characters]);

  // Initialize all characters
  useEffect(() => {
    characters.forEach((char, index) => {
      if (char !== " " && char !== "\u00A0") {
        initializeCharacter(index);
      }
    });
  }, [characters, initializeCharacter]);


  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);


  // Draw word on canvas
  const drawWord = useCallback((
    canvas: HTMLCanvasElement,
    wordIndex: number,
    word: Word
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw guide lines across entire word
    ctx.strokeStyle = "rgba(100, 150, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Top line
    ctx.beginPath();
    ctx.moveTo(CANVAS_PADDING, TOP_LINE_Y);
    ctx.lineTo(canvas.width - CANVAS_PADDING, TOP_LINE_Y);
    ctx.stroke();
    
    // Middle line
    ctx.beginPath();
    ctx.moveTo(CANVAS_PADDING, MIDDLE_LINE_Y);
    ctx.lineTo(canvas.width - CANVAS_PADDING, MIDDLE_LINE_Y);
    ctx.stroke();
    
    // Bottom line (baseline)
    ctx.beginPath();
    ctx.moveTo(CANVAS_PADDING, BOTTOM_LINE_Y);
    ctx.lineTo(canvas.width - CANVAS_PADDING, BOTTOM_LINE_Y);
    ctx.stroke();
    
    ctx.setLineDash([]);

    // Draw each letter in the word
    word.chars.forEach((char, letterIndexInWord) => {
      const charIndex = word.charIndices[letterIndexInWord];
      const strokes = getCharacterStrokes(char);
      const strokeProgress = strokeProgressRef.current.get(charIndex) || strokes.map(() => 0);
      const currentStroke = currentStrokeRef.current.get(charIndex) || 0;
      const isActive = charIndex === currentCharIndex;
      const isCompleted = completedIndices.has(charIndex);

      // Calculate horizontal offset for this letter
      const letterX = CANVAS_PADDING + letterIndexInWord * (LETTER_WIDTH + LETTER_SPACING);
      const letterCenterX = letterX + LETTER_WIDTH / 2;
      
      // Scale factor: scale letters down by ~20% (from 0.5 to 0.4)
      const scale = 0.4; // Smaller scale for more compact letters
      
      // Letter strokes are drawn in 600x600 coordinate system centered at (300, 300)
      // We need to position them at letterCenterX on our canvas
      const offsetX = letterCenterX; // Position letter at its target X
      const offsetY = MIDDLE_LINE_Y; // Center vertically on middle guide line

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.translate(-300, -300); // Center the 600x600 letter coordinate system

      // Draw guide letter
      ctx.strokeStyle = isCompleted
        ? "rgba(200, 200, 200, 0.25)"
        : isActive
        ? "rgba(200, 200, 200, 0.3)"
        : "rgba(150, 150, 150, 0.4)";
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

      // Draw rainbow progress
      strokes.forEach((stroke, strokeIndex) => {
        const progress = strokeProgress[strokeIndex] || 0;
        if (progress <= 0.01) return;

        const points = stroke.points;
        const numPoints = Math.floor(points.length * Math.min(progress, 1));

        if (numPoints < 2) return;

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

      // Draw indicator for active letter
      if (isActive && currentStroke < strokes.length) {
        const stroke = strokes[currentStroke];
        const progress = strokeProgress[currentStroke] || 0;
        
        if (progress < 1) {
          let indicatorPoint;
          let nextPoint;
          
          if (progress === 0) {
            indicatorPoint = stroke.points[0];
            nextPoint = stroke.points[1];
          } else {
            const pointIndex = Math.floor(stroke.points.length * progress);
            if (pointIndex < stroke.points.length - 1) {
              indicatorPoint = stroke.points[pointIndex];
              nextPoint = stroke.points[pointIndex + 1];
            } else {
              indicatorPoint = stroke.points[stroke.points.length - 2];
              nextPoint = stroke.points[stroke.points.length - 1];
            }
          }
          
          ctx.fillStyle = `rgba(0, 255, 0, 1)`;
          ctx.beginPath();
          ctx.arc(indicatorPoint.x, indicatorPoint.y, 25, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(indicatorPoint.x, indicatorPoint.y, 12, 0, Math.PI * 2);
          ctx.fill();
          
          if (nextPoint) {
            const angle = Math.atan2(nextPoint.y - indicatorPoint.y, nextPoint.x - indicatorPoint.x);
            const arrowLength = 40;
            
            ctx.strokeStyle = "rgba(255, 255, 255, 1)";
            ctx.fillStyle = "rgba(255, 255, 255, 1)";
            ctx.lineWidth = 6;
            
            ctx.beginPath();
            ctx.moveTo(indicatorPoint.x, indicatorPoint.y);
            ctx.lineTo(
              indicatorPoint.x + Math.cos(angle) * arrowLength,
              indicatorPoint.y + Math.sin(angle) * arrowLength
            );
            ctx.stroke();
            
            ctx.beginPath();
            const headX = indicatorPoint.x + Math.cos(angle) * arrowLength;
            const headY = indicatorPoint.y + Math.sin(angle) * arrowLength;
            ctx.moveTo(headX, headY);
            ctx.lineTo(
              headX - Math.cos(angle - Math.PI / 6) * 20,
              headY - Math.sin(angle - Math.PI / 6) * 20
            );
            ctx.lineTo(
              headX - Math.cos(angle + Math.PI / 6) * 20,
              headY - Math.sin(angle + Math.PI / 6) * 20
            );
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      ctx.restore();
    });
  }, [currentCharIndex, completedIndices]);

  // Redraw all word canvases
  useEffect(() => {
    words.forEach((word, wordIndex) => {
      const canvas = canvasRefs.current.get(wordIndex);
      if (canvas) {
        drawWord(canvas, wordIndex, word);
      }
    });
  }, [words, currentCharIndex, completedIndices, drawWord]);

  const handlePointerDown = (wordIndex: number, e: React.PointerEvent<HTMLCanvasElement>) => {
    const word = words[wordIndex];
    const canvas = canvasRefs.current.get(wordIndex);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasX = (screenX * canvas.width) / rect.width;
    const canvasY = (screenY * canvas.height) / rect.height;

    // Find which letter was clicked
    let clickedCharIndex = -1;
    word.chars.forEach((char, letterIndex) => {
      const charIndex = word.charIndices[letterIndex];
      if (charIndex !== currentCharIndex || completedIndices.has(charIndex)) return;

      const letterX = CANVAS_PADDING + letterIndex * (LETTER_WIDTH + LETTER_SPACING);
      const letterCenterX = letterX + LETTER_WIDTH / 2;
      
      // Check if click is within this letter's bounds
      if (canvasX >= letterX && canvasX < letterX + LETTER_WIDTH) {
        const strokes = getCharacterStrokes(char);
        const currentStroke = currentStrokeRef.current.get(charIndex) || 0;
        const strokeProgress = strokeProgressRef.current.get(charIndex) || strokes.map(() => 0);
        const currentProgress = strokeProgress[currentStroke];

        // Convert to 600px coordinate space (must match drawing transformation)
        // Drawing: translate(letterCenterX, MIDDLE_LINE_Y) -> scale(0.4) -> translate(-300, -300)
        // Reverse: add 300 -> scale up -> subtract offset
        const scale = 0.4;
        const offsetX = letterCenterX;
        const offsetY = MIDDLE_LINE_Y;
        
        const x = ((canvasX - offsetX) / scale) + 300;
        const y = ((canvasY - offsetY) / scale) + 300;

        if (currentStroke < strokes.length) {
          const stroke = strokes[currentStroke];
          const currentPointIndex = Math.floor(stroke.points.length * currentProgress);
          
          const checkPoints = currentProgress === 0 
            ? [stroke.points[0]]
            : stroke.points.slice(currentPointIndex, Math.min(currentPointIndex + 15, stroke.points.length));
          
          for (const point of checkPoints) {
            const distance = Math.sqrt(
              Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
            );

            if (distance < 80) {
              clickedCharIndex = charIndex;
              isDrawingRef.current.set(charIndex, true);
              break;
            }
          }
        }
      }
    });
  };

  const handlePointerMove = (wordIndex: number, e: React.PointerEvent<HTMLCanvasElement>) => {
    const word = words[wordIndex];
    const canvas = canvasRefs.current.get(wordIndex);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasX = (screenX * canvas.width) / rect.width;
    const canvasY = (screenY * canvas.height) / rect.height;

    // Find which letter is being traced
    word.chars.forEach((char, letterIndex) => {
      const charIndex = word.charIndices[letterIndex];
      if (charIndex !== currentCharIndex || !isDrawingRef.current.get(charIndex) || completedIndices.has(charIndex)) return;

      const letterX = CANVAS_PADDING + letterIndex * (LETTER_WIDTH + LETTER_SPACING);
      const letterCenterX = letterX + LETTER_WIDTH / 2;
      
      const strokes = getCharacterStrokes(char);
      const currentStroke = currentStrokeRef.current.get(charIndex) || 0;
      const strokeProgress = strokeProgressRef.current.get(charIndex) || strokes.map(() => 0);
      const currentProgress = strokeProgress[currentStroke];

      // Convert to 600px coordinate space (must match drawing transformation)
      // Drawing: translate(letterCenterX, MIDDLE_LINE_Y) -> scale(0.4) -> translate(-300, -300)
      // Reverse: add 300 -> scale up -> subtract offset
      const scale = 0.4;
      const offsetX = letterCenterX;
      const offsetY = MIDDLE_LINE_Y;
      
      const x = ((canvasX - offsetX) / scale) + 300;
      const y = ((canvasY - offsetY) / scale) + 300;

      if (currentStroke >= strokes.length) return;

      const stroke = strokes[currentStroke];
      const currentPointIndex = Math.floor(stroke.points.length * currentProgress);

      let bestMatchIndex = -1;
      let bestMatchDistance = Infinity;
      const lookAheadCount = 5;
      
      for (let i = 0; i < lookAheadCount && currentPointIndex + i < stroke.points.length; i++) {
        const checkPoint = stroke.points[currentPointIndex + i];
        const distance = Math.sqrt(
          Math.pow(x - checkPoint.x, 2) + Math.pow(y - checkPoint.y, 2)
        );
        
        if (distance < 120 && distance < bestMatchDistance) {
          bestMatchDistance = distance;
          bestMatchIndex = currentPointIndex + i;
        }
      }

      if (bestMatchIndex >= 0) {
        const now = Date.now();
        if (now - lastUpdateRef.current > 50) {
          const advanceBy = Math.min(bestMatchIndex - currentPointIndex, 2);
          const newProgress = Math.min((currentPointIndex + advanceBy + 1) / stroke.points.length, 1);
          const newStrokeProgress = [...strokeProgress];
          newStrokeProgress[currentStroke] = newProgress;
          strokeProgressRef.current.set(charIndex, newStrokeProgress);
          lastUpdateRef.current = now;

          if (newProgress >= 1) {
            if (currentStroke === strokes.length - 1) {
              // Letter complete!
              const newCompletedIndices = new Set([...completedIndices, charIndex]);
              setCompletedIndices(newCompletedIndices);
              isDrawingRef.current.set(charIndex, false);

              // Check if current word is complete
              const currentWord = words[currentWordIndex];
              const wordComplete = currentWord.charIndices.every(idx => newCompletedIndices.has(idx));

              if (wordComplete && !completedWordsRef.current.has(currentWordIndex)) {
                completedWordsRef.current.add(currentWordIndex);

                // Play word TTS immediately to stay within user gesture context
                addSentenceDebugLog('🎯 Word completed - playing TTS immediately');
                playWordTTS(currentWordIndex);

                // Move to next word if not the last word
                if (currentWordIndex < words.length - 1) {
                  const nextWordIndex = currentWordIndex + 1;
                  const nextWord = words[nextWordIndex];
                  const nextCharIndex = nextWord.charIndices[0];

                  // Convert character index to traceable index
                  let traceableIndex = 0;
                  for (let i = 0; i < nextCharIndex; i++) {
                    if (characters[i] !== " " && characters[i] !== "\u00A0") {
                      traceableIndex++;
                    }
                  }

                  setTimeout(() => {
                    setCurrentWordIndex(nextWordIndex);
                    setCurrentIndex(traceableIndex);
                  }, 600);
                  return; // Skip the normal letter-by-letter advancement
                }
              }
              
              // Move to next character (letter-by-letter within a word)
              if (isLastChar) {
                // All letters complete - play sentence TTS immediately
                addSentenceDebugLog('🎯 Sentence completed - playing TTS immediately');
                playSentenceTTS();
                
                setShowCelebration(true);
                if (profileId) {
                  const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
                  logLetterPractice(profileId, sentence, true, durationSeconds).catch(err => {
                    console.error('Failed to log sentence practice:', err);
                  });
                }
                setTimeout(() => {
                  setShowCelebration(false);
                  onComplete();
                }, 3000); // Increased to allow TTS to finish
              } else if (!wordComplete) {
                // Only advance letter-by-letter if word is not complete
                setTimeout(() => {
                  setCurrentIndex(currentIndex + 1);
                }, 500);
              }
            } else {
              currentStrokeRef.current.set(charIndex, currentStroke + 1);
              isDrawingRef.current.set(charIndex, false);
            }
          }
          
          // Redraw
          const canvas = canvasRefs.current.get(wordIndex);
          if (canvas) {
            drawWord(canvas, wordIndex, word);
          }
        }
      }
    });
  };

  const handlePointerUp = (wordIndex: number) => {
    const word = words[wordIndex];
    word.charIndices.forEach((charIndex) => {
      isDrawingRef.current.set(charIndex, false);
    });
  };

  const playCompletionSound = async () => {
    if (!isSoundEnabled) return;
    
    try {
      const cheerPhrases = [
        "Bra jobbat!",
        "Fantastiskt!",
        "Perfekt!",
        "Underbart!",
        "Jättebra!",
      ];
      const randomPhrase = cheerPhrases[Math.floor(Math.random() * cheerPhrases.length)];
      
      const response = await fetch("/api/tts-cached", {
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
        
        // iOS requires explicit play promise handling
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.log("Audio play prevented:", error);
            // iOS may block autoplay - user needs to interact first
          });
        }
        
        audio.onended = () => URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      console.log("Could not play completion sound:", error);
    }
  };

  if (characters.length === 0 || words.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-500 to-blue-500 flex flex-col items-center justify-center">
        <div className="text-white text-xl mb-4">Ingen mening att träna på!</div>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-white text-green-600 rounded-full font-semibold"
        >
          ← Tillbaka
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-500 to-blue-500 flex flex-col">
      {/* Range Slider Styles for iOS */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
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
            Träna på: {sentence}
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
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #9333ea 0%, #9333ea ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`
                          }}
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
          </div>
        </div>
      </header>

      {/* Debug Panel */}
      {showSentenceDebug ? (
        <div className="fixed top-20 left-4 right-4 z-50 max-h-60 overflow-y-auto rounded-2xl bg-black/90 text-green-400 p-4 shadow-xl border border-gray-600 font-mono text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">🔊 Sentence Tracing Debug Logs</span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sentenceDebugLogs.join('\n')).catch(() => {});
                }}
                className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Copy Logs
              </button>
              <button
                onClick={() => setSentenceDebugLogs([])}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
              >
                Clear
              </button>
              <button
                onClick={() => setShowSentenceDebug(false)}
                className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded"
              >
                Close
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {sentenceDebugLogs.length === 0 ? (
              <div className="text-gray-500 italic">No logs yet. Complete a word to generate logs.</div>
            ) : (
              sentenceDebugLogs.slice(-10).map((log, index) => (
                <div key={index} className="whitespace-pre-wrap break-words">
                  {log}
                </div>
              ))
            )}
            {sentenceDebugLogs.length > 10 && (
              <div className="text-gray-500 italic text-center mt-2">
                ... and {sentenceDebugLogs.length - 10} more logs
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Debug Toggle Button */}
      {!showSentenceDebug && (
        <button
          onClick={() => setShowSentenceDebug(true)}
          className="fixed top-20 right-4 z-50 text-xs rounded-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white shadow-lg border-2 border-white"
        >
          Debug 📋
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-full mx-auto">
          {/* Progress indicator */}
          <div className="mb-6 text-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-6 py-3 inline-block">
              <div className="text-sm text-gray-600">
                Ord {currentWordIndex + 1} av {words.length} • Bokstav {currentIndex + 1} av {traceableChars.length}
              </div>
            </div>
          </div>

          {/* Current Word Display */}
          <div className="flex justify-center items-center">
            <div className="flex justify-center gap-4">
              {(() => {
                const currentWord = words[currentWordIndex];
                if (!currentWord) return null;

                const hasActiveLetter = currentWord.charIndices.includes(currentCharIndex);
                const allCompleted = currentWord.charIndices.every(idx => completedIndices.has(idx));

                return (
                  <div
                    key={`word-${currentWordIndex}`}
                    className={`relative flex flex-col items-center ${
                      hasActiveLetter ? "ring-2 ring-yellow-400 ring-offset-1 rounded-lg" : ""
                    } ${allCompleted ? "opacity-80" : ""}`}
                  >
                    {/* Word label */}
                    <div className={`text-lg font-bold mb-2 ${
                      allCompleted ? "text-green-600" : hasActiveLetter ? "text-yellow-400" : "text-gray-600"
                    }`}>
                      {currentWord.chars.join("")}
                    </div>
                    {/* Canvas */}
                    <canvas
                      ref={(el) => {
                        if (el) canvasRefs.current.set(currentWordIndex, el);
                      }}
                      width={currentWord.canvasWidth}
                      height={CANVAS_HEIGHT}
                      onPointerDown={(e) => handlePointerDown(currentWordIndex, e)}
                      onPointerMove={(e) => handlePointerMove(currentWordIndex, e)}
                      onPointerUp={() => handlePointerUp(currentWordIndex)}
                      onPointerLeave={() => handlePointerUp(currentWordIndex)}
                      className={`bg-white/90 rounded-lg shadow-lg cursor-crosshair touch-none ${
                        hasActiveLetter ? "ring-1 ring-yellow-400" : ""
                      }`}
                      style={{ width: currentWord.canvasWidth, height: CANVAS_HEIGHT }}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </main>

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
    </div>
  );
}
