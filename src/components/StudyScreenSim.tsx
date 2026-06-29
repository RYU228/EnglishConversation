import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Volume2, Ear, HelpCircle, AudioLines, Eye } from 'lucide-react';
import { DialogItem } from '../types';
import { conversationsData } from '../data/conversationsData';

interface StudyScreenSimProps {
  topicKey: string;
  topicTitle: string;
  targetRepeatCount: number;
  autoProceed: boolean;
  randomPlay: boolean;
  onBack: () => void;
}

export default function StudyScreenSim({
  topicKey,
  topicTitle,
  targetRepeatCount,
  autoProceed,
  randomPlay,
  onBack,
}: StudyScreenSimProps) {
  // Load dialogues for current topic
  const rawDialogs = conversationsData[topicKey]?.dialogs || [];
  
  // States of study state board
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentRepeatIndex, setCurrentRepeatIndex] = useState(0);
  const [revealTranslation, setRevealTranslation] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<'A' | 'B' | null>(null);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [autoProceedCountdown, setAutoProceedCountdown] = useState<number | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(() => {
    const saved = localStorage.getItem('speech_rate');
    return saved ? parseFloat(saved) : 1.15; // 기본 값을 원어민 표준 속도인 1.15x로 최적화
  });

  // 추가 1. 대화별 정답/오답/헷갈림 상태 관리
  const [dialogStatus, setDialogStatus] = useState<Record<number, 'KNOW' | 'CONFUSED' | 'WRONG' | 'NONE'>>({});

  // 추가 2. 점진적 힌트 단계 상태 (1단계: 한국어뜻만, 2단계: 핵심패턴만 노출, 3단계: 빈칸 채우기, 4단계: 전체공개)
  const [hintLevel, setHintLevel] = useState<number>(4);

  // 로컬 스토리지에서 각 대화별 학습 상태 로드
  useEffect(() => {
    const statuses: Record<number, 'KNOW' | 'CONFUSED' | 'WRONG' | 'NONE'> = {};
    rawDialogs.forEach((_, idx) => {
      const saved = localStorage.getItem(`dialog_status_${topicKey}_${idx}`) as 'KNOW' | 'CONFUSED' | 'WRONG' | null;
      statuses[idx] = saved || 'NONE';
    });
    setDialogStatus(statuses);
  }, [topicKey, rawDialogs]);

  // 학습 상태 업데이트 핸들러
  const handleUpdateStatus = (index: number, status: 'KNOW' | 'CONFUSED' | 'WRONG') => {
    localStorage.setItem(`dialog_status_${topicKey}_${index}`, status);
    setDialogStatus(prev => ({ ...prev, [index]: status }));
  };

  // 점진적 힌트 필터링 헬퍼 함수
  const getHintedEnglish = (sentence: string, level: number): string => {
    if (level === 1) {
      return ""; // 완전히 숨김
    }
    
    if (level === 2) {
      // 2단계: 영어 문장의 주요 패턴만 노출하고 나머지는 글자 수만큼 온점(•) 처리
      const patterns = [
        "Do you have", "Could I", "I don't have to", "How about", "I'm looking for", 
        "How have you been", "What are your", "It's really", "Did you have", 
        "What can I", "Would you like", "Can I get", "Are you ready", "How would you", 
        "Excuse me", "Where is", "What time is", "Is there", "Did you", "When is", "Is the"
      ];
      
      const lowerSentence = sentence.toLowerCase().trim();
      for (const pat of patterns) {
        if (lowerSentence.startsWith(pat.toLowerCase())) {
          const patternLength = pat.length;
          const patternPart = sentence.substring(0, patternLength);
          const restPart = sentence.substring(patternLength);
          const maskedRest = restPart.replace(/[a-zA-Z]/g, "•");
          return patternPart + maskedRest;
        }
      }
      
      // 패턴 미발견 시: 첫 두 단어만 노출하고 나머지는 • 처리
      const words = sentence.split(" ");
      if (words.length <= 2) return sentence;
      const visiblePart = words.slice(0, 2).join(" ");
      const hiddenPart = words.slice(2).join(" ").replace(/[a-zA-Z]/g, "•");
      return visiblePart + " " + hiddenPart;
    }
    
    if (level === 3) {
      // 3단계: 빈칸 채우기 형태 (긴 단어 1~2개를 [_____] 형태로 가림)
      const words = sentence.split(" ");
      if (words.length <= 1) return sentence;
      
      const sortedIndices = words
        .map((w, idx) => ({ word: w.replace(/[.,?!]/g, ""), idx, length: w.replace(/[.,?!]/g, "").length }))
        .filter(item => item.length > 2)
        .sort((a, b) => b.length - a.length);
        
      if (sortedIndices.length === 0) return sentence;
      
      const countToHide = Math.min(2, Math.max(1, Math.floor(words.length / 4)));
      const indicesToHide = sortedIndices.slice(0, countToHide).map(x => x.idx);
      
      const resultWords = words.map((w, idx) => {
        if (indicesToHide.includes(idx)) {
          const punctuation = w.match(/[.,?!]/g)?.join("") || "";
          const cleanWord = w.replace(/[.,?!]/g, "");
          const blanks = "_".repeat(cleanWord.length);
          return `[${blanks}]${punctuation}`;
        }
        return w;
      });
      
      return resultWords.join(" ");
    }
    
    return sentence; // 4단계: 전체 노출
  };

  // 가중치 무작위 인덱스 추출 헬퍼 함수 (상태별 가중치 적용)
  const getNextWeightedIndex = (currentIdx: number, listLength: number): number => {
    if (listLength <= 1) return 0;
    
    const weights: number[] = Array.from({ length: listLength }, (_, i) => {
      const saved = localStorage.getItem(`dialog_status_${topicKey}_${i}`);
      if (saved === 'WRONG') return 5.0;      // 몰라요(오답): 가중치 5.0 (가장 자주 재생)
      if (saved === 'CONFUSED') return 3.0;   // 헷갈려요: 가중치 3.0 (더 자주 재생)
      if (saved === 'KNOW') return 0.8;       // 알아요(정답): 가중치 0.8 (적은 비율로 재생)
      return 2.0;                             // 미지정/기본: 가중치 2.0
    });

    // 직전에 들었던 문장이 연속으로 바로 또 나오는 것은 방지 (가중치를 최소화)
    if (currentIdx >= 0 && currentIdx < listLength) {
      weights[currentIdx] = 0.1;
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let r = Math.random() * totalWeight;
    
    for (let i = 0; i < listLength; i++) {
      r -= weights[i];
      if (r <= 0) {
        return i;
      }
    }
    return (currentIdx + 1) % listLength;
  };

  // Refs for tracking async cancellation and timers
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMounted = useRef(true);
  const playStateRef = useRef({ isPlaying: false, isPaused: false, currentIndex: 0, currentRepeatIndex: 0 });
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Web Audio API refs for mobile-immune sound playing
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Initialize single reusable Audio element and silent wake to unlock mobile browsers
  useEffect(() => {
    // 1-pixel tiny silent audio wav base64 to warm up the element
    const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
    activeAudioRef.current = audio;
    
    return () => {
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.src = "";
        } catch (e) {}
        activeAudioRef.current = null;
      }
    };
  }, []);

  // Sync ref values for async callbacks
  useEffect(() => {
    playStateRef.current = { isPlaying, isPaused, currentIndex, currentRepeatIndex };
  }, [isPlaying, isPaused, currentIndex, currentRepeatIndex]);

  // Mobile Web User Gesture Unlock Trigger
  const unlockAudioForMobile = () => {
    // 1. Unlocks/Warms up reusable HTML5 Audio
    if (activeAudioRef.current) {
      activeAudioRef.current.play().then(() => {
        if (activeAudioRef.current) {
          activeAudioRef.current.pause();
        }
      }).catch((e) => {
        console.warn("Mobile HTML5 Audio unlock failed:", e);
      });
    } else {
      const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA");
      activeAudioRef.current = audio;
      audio.play().then(() => {
        audio.pause();
      }).catch((e) => {
        console.warn("Mobile HTML5 Audio inline warm-up failed:", e);
      });
    }

    // 2. Unlocks/Warms up Web SpeechSynthesis
    if (window.speechSynthesis) {
      try {
        const silentUtterance = new SpeechSynthesisUtterance(" ");
        silentUtterance.volume = 0;
        silentUtterance.rate = 1.0;
        window.speechSynthesis.speak(silentUtterance);
      } catch (e) {
        console.warn("Mobile Web SpeechSynthesis unlock failed:", e);
      }
    }
  };

  // Handle initialization and optional randomizing
  useEffect(() => {
    isComponentMounted.current = true;
    const items = [...rawDialogs];
    setDialogs(items);
    
    // 만약 랜덤 재생이라면, 가중치가 반영된 무작위 인덱스에서부터 재생을 시작합니다.
    let startIndex = 0;
    if (randomPlay && items.length > 0) {
      startIndex = getNextWeightedIndex(-1, items.length);
    }

    setCurrentIndex(startIndex);
    setCurrentRepeatIndex(0);
    setRevealTranslation(false);
    setIsPlaying(false);
    setIsPaused(false);

    // Auto play on screen load (may be blocked on mobile until user taps play, which is handled gracefully)
    const timer = setTimeout(() => {
      startPlayback(items, startIndex, 0);
    }, 400);

    return () => {
      isComponentMounted.current = false;
      stopTtsAndTimers();
      clearTimeout(timer);
    };
  }, [topicKey, randomPlay]);

  // Helper to cancel TTS and all timeouts
  const stopTtsAndTimers = () => {
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn(e);
      }
    }
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
      } catch (err) {
        console.warn("Error pausing active audio:", err);
      }
    }
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (e) {}
      activeSourceRef.current = null;
    }
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoProceedCountdown(null);
    setIsSpeakingTts(false);
    setActiveSpeaker(null);
  };

  // Local Web TTS Fallback
  const runWebSpeechSynthesisFallback = (
    text: string, 
    voiceLang: string, 
    speaker: 'A' | 'B', 
    fallbackTimeout: NodeJS.Timeout, 
    resolveFn: () => void
  ) => {
    if (!window.speechSynthesis) {
      clearTimeout(fallbackTimeout);
      setIsSpeakingTts(false);
      resolveFn();
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn(err);
    }

    setTimeout(() => {
      if (!isComponentMounted.current) return;
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voiceLang;
        utterance.rate = voiceLang.startsWith('ko') ? 0.95 : speechRate;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          let selectedVoice = null;
          const matchesLang = voices.filter(v => v.lang.toLowerCase().startsWith(voiceLang.toLowerCase().substring(0, 2)));
          
          if (voiceLang.startsWith('en')) {
            selectedVoice = matchesLang.find(v => v.localService && (v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Google'))) ||
                            matchesLang.find(v => v.localService) ||
                            matchesLang.find(v => v.name.includes('Samantha') || v.name.includes('Google US English')) ||
                            matchesLang[0];
          } else {
            selectedVoice = matchesLang.find(v => v.localService && (v.name.includes('Yuna') || v.name.includes('Google'))) ||
                            matchesLang.find(v => v.localService) ||
                            matchesLang.find(v => v.name.includes('Yuna')) ||
                            matchesLang[0];
          }
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        utterance.onend = () => {
          clearTimeout(fallbackTimeout);
          setIsSpeakingTts(false);
          resolveFn();
        };

        utterance.onerror = (e) => {
          console.warn("Local fallback TTS ended error:", e);
          clearTimeout(fallbackTimeout);
          setIsSpeakingTts(false);
          resolveFn();
        };

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error("Local fallback TTS register error:", e);
        clearTimeout(fallbackTimeout);
        setIsSpeakingTts(false);
        resolveFn();
      }
    }, 35);
  };

  // TTS Speaking function with fallback visual timing if SpeechSynthesis/API fails
  const speakText = (text: string, voiceLang = 'en-US', speaker: 'A' | 'B' = 'A'): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!isComponentMounted.current) {
        resolve();
        return;
      }

      setIsSpeakingTts(true);

      // Safe fallback timer that guarantees progress if audio tags block or drop
      const wordCount = text.split(' ').length;
      const speedFactor = voiceLang.startsWith('en') ? (1.0 / speechRate) : 1.0;
      const fallbackDuration = Math.max(1800, Math.floor(wordCount * 365 * speedFactor + 900));

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          console.log("[TTS Fallback Timer] Force resolving line to prevent study lock.");
          resolved = true;
          setIsSpeakingTts(false);
          resolve();
        }
      }, fallbackDuration);

      // Stop any prior playing audio node safely
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
        } catch (e) {
          console.warn("Error releasing prior audio:", e);
        }
      } else {
        activeAudioRef.current = new Audio();
      }

      // 1. Attempt High Quality Google Cloud Neural2 backend proxy (or Google Translate fallback)
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            lang: voiceLang,
            speaker,
            speed: speechRate,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audioContent && isComponentMounted.current && !resolved) {
            
            // Helper for traditional HTML5 Audio play fallback if needed
            const playHtml5AudioFallback = async () => {
              const audio = activeAudioRef.current || new Audio();
              activeAudioRef.current = audio;
              audio.src = `data:audio/mp3;base64,${data.audioContent}`;
              
              audio.onended = () => {
                clearTimeout(timer);
                if (!resolved) {
                  resolved = true;
                  setIsSpeakingTts(false);
                  resolve();
                }
              };

              audio.onerror = (err) => {
                console.warn("HTML5 audio playback failed. Falling back to local synthesis.", err);
                if (!resolved) {
                  runWebSpeechSynthesisFallback(text, voiceLang, speaker, timer, resolve);
                }
              };

              try {
                await audio.play();
              } catch (playErr) {
                console.warn("HTML5 audio play blocked:", playErr);
                // Switch back to paused state if blocked
                setIsPlaying(false);
                setIsPaused(true);
                clearTimeout(timer);
                if (!resolved) {
                  resolved = true;
                  setIsSpeakingTts(false);
                  resolve();
                }
              }
            };

            // Web Audio API playback (highly reliable on mobile browsers once unlocked)
            try {
              if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              const ctx = audioCtxRef.current;
              
              if (ctx.state === "suspended") {
                await ctx.resume();
              }

              const arrayBuffer = base64ToArrayBuffer(data.audioContent);
              ctx.decodeAudioData(arrayBuffer, (audioBuffer) => {
                if (!isComponentMounted.current || resolved) return;

                // Stop any current playing source
                if (activeSourceRef.current) {
                  try { activeSourceRef.current.stop(); } catch (e) {}
                  activeSourceRef.current = null;
                }

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                activeSourceRef.current = source;

                source.onended = () => {
                  clearTimeout(timer);
                  if (!resolved) {
                    resolved = true;
                    setIsSpeakingTts(false);
                    resolve();
                  }
                };

                source.start(0);
              }, (decodeErr) => {
                console.warn("Web Audio decoding failed, falling back to HTML5 audio element:", decodeErr);
                playHtml5AudioFallback();
              });
            } catch (webAudioErr) {
              console.warn("Web Audio context start failed, falling back to HTML5 audio element:", webAudioErr);
              await playHtml5AudioFallback();
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Proxy api is unavailable, calling offline synthesis...", err);
      }

      // 2. Play offline speech synthesis fallback
      if (!resolved) {
        runWebSpeechSynthesisFallback(text, voiceLang, speaker, timer, resolve);
      }
    });
  };

  // Main synchronous loop controller
  const startPlayback = async (loadedDialogs: DialogItem[], index: number, startRepeatAt: number) => {
    stopTtsAndTimers();

    const currentList = loadedDialogs.length > 0 ? loadedDialogs : dialogs;
    if (currentList.length === 0 || index >= currentList.length) return;

    setIsPlaying(true);
    setIsPaused(false);
    setRevealTranslation(false);

    let repeatIdx = startRepeatAt;
    setCurrentRepeatIndex(repeatIdx);

    const dialog = currentList[index];

    // Helper sleep function that respects isPlaying and isPaused changes
    const sleep = (ms: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const checkInterval = 50;
        let elapsed = 0;
        const checkTimer = setInterval(() => {
          if (!isComponentMounted.current || !playStateRef.current.isPlaying || playStateRef.current.isPaused) {
            clearInterval(checkTimer);
            resolve(false); // cancel sleeping
            return;
          }
          elapsed += checkInterval;
          if (elapsed >= ms) {
            clearInterval(checkTimer);
            resolve(true); // completed sleeping
          }
        }, checkInterval);
      });
    };

    while (isComponentMounted.current && playStateRef.current.isPlaying && !playStateRef.current.isPaused && repeatIdx < targetRepeatCount) {
      // 1. Speak Speaker A's sentence
      setActiveSpeaker('A');
      await speakText(dialog.english[0], 'en-US', 'A');
      setActiveSpeaker(null);
      
      // 문장 사이 1초 대기
      const continue0 = await sleep(1000);
      if (!continue0) return;

      // 2. Speak Speaker B's sentence
      setActiveSpeaker('B');
      await speakText(dialog.english[1], 'en-US', 'B');
      setActiveSpeaker(null);

      repeatIdx += 1;
      setCurrentRepeatIndex(repeatIdx);

      if (repeatIdx < targetRepeatCount) {
        // 대화 종료 후 2초 대기 후 다음 반복 진행
        const continue1 = await sleep(2000);
        if (!continue1) return;
      }
    }

    // Done with target repetitions! Reveal transcription script
    if (isComponentMounted.current && playStateRef.current.isPlaying && !playStateRef.current.isPaused && repeatIdx >= targetRepeatCount) {
      setRevealTranslation(true);
      setIsPlaying(false);
      setActiveSpeaker(null);

      // Trigger auto proceed countdown if enabled
      if (autoProceed) {
        if (randomPlay || index < currentList.length - 1) {
          let count = 3;
          setAutoProceedCountdown(count);
          countdownIntervalRef.current = setInterval(() => {
            count -= 1;
            if (count <= 0) {
              clearInterval(countdownIntervalRef.current!);
              countdownIntervalRef.current = null;
              setAutoProceedCountdown(null);
              // Move to next dialog!
              const nextIdx = randomPlay ? getNextWeightedIndex(index, currentList.length) : index + 1;
              setCurrentIndex(nextIdx);
              setCurrentRepeatIndex(0);
              setRevealTranslation(false);
              startPlayback(currentList, nextIdx, 0);
            } else {
              setAutoProceedCountdown(count);
            }
          }, 1000);
        }
      }
    }
  };

  const handlePlayPause = () => {
    // Unlocks mobile browser gesture blockers
    unlockAudioForMobile();

    if (isPlaying && !isPaused) {
      // Pause
      setIsPaused(true);
      setIsPlaying(false);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingTts(false);
      setActiveSpeaker(null);
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
    } else {
      // Resume
      const resumeRepeatIndex = currentRepeatIndex >= targetRepeatCount ? 0 : currentRepeatIndex;
      startPlayback(dialogs, currentIndex, resumeRepeatIndex);
    }
  };

  const handlePrev = () => {
    unlockAudioForMobile();

    if (currentIndex > 0) {
      const nextIdx = currentIndex - 1;
      setCurrentIndex(nextIdx);
      setCurrentRepeatIndex(0);
      setRevealTranslation(false);
      stopTtsAndTimers();
      // Auto play next dialogue instantly
      setTimeout(() => {
        startPlayback(dialogs, nextIdx, 0);
      }, 200);
    }
  };

  const handleNext = () => {
    unlockAudioForMobile();

    if (randomPlay || currentIndex < dialogs.length - 1) {
      const nextIdx = randomPlay ? getNextWeightedIndex(currentIndex, dialogs.length) : currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentRepeatIndex(0);
      setRevealTranslation(false);
      stopTtsAndTimers();
      // Auto play next dialogue instantly
      setTimeout(() => {
        startPlayback(dialogs, nextIdx, 0);
      }, 200);
    }
  };

  const handleReplay = () => {
    unlockAudioForMobile();

    stopTtsAndTimers();
    setCurrentRepeatIndex(0);
    setRevealTranslation(false);
    setTimeout(() => {
      startPlayback(dialogs, currentIndex, 0);
    }, 200);
  };

  const currentDialog = dialogs[currentIndex];
  const progressPercent = dialogs.length > 0 ? ((currentIndex + 1) / dialogs.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans select-none">
      {/* AppBar */}
      <div className="flex items-center px-4 h-14 bg-white border-b border-slate-100 shrink-0 shadow-xs relative">
        <button
          onClick={() => {
            stopTtsAndTimers();
            onBack();
          }}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          id="btn-study-back"
          title="목록 화면 이동"
        >
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-bold text-slate-800 text-sm">
          {topicTitle}
        </span>
      </div>

      {/* 1. Progress Indicator Area */}
      <div className="px-5 py-3.5 bg-white border-b border-slate-100 shrink-0 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400">학습 진행률</span>
          <span className="text-teal-600 font-extrabold text-sm">{currentIndex + 1} / {dialogs.length}</span>
        </div>

        {/* Custom Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ChoiceChip Repeat Indicators & Speed Controller */}
        <div className="flex flex-col items-center gap-1.5 mt-1">
          <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200/40 rounded-full px-3 py-1 text-[11px] font-bold text-slate-600 shadow-3xs">
            <span className="text-slate-400">발음 속도:</span>
            <select
              value={speechRate}
              onChange={(e) => {
                const newRate = parseFloat(e.target.value);
                setSpeechRate(newRate);
                localStorage.setItem('speech_rate', newRate.toString());
                // 속도가 바뀌면 진행중인 발음을 멈추고 새 배속으로 다시 시작을 부드럽게 유도할 수 있도록 tts 정지
                if (window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
              className="bg-transparent border-none outline-none font-extrabold text-teal-600 text-[11px] cursor-pointer"
            >
              <option value="0.65">0.65x (매우 느리게)</option>
              <option value="0.75">0.75x (원어민 기초학습)</option>
              <option value="0.85">0.85x (부드러운 섀도잉)</option>
              <option value="1.0">1.00x (원어민 표준속도)</option>
              <option value="1.15">1.15x (자연스러운 원어민속도 - 권장 기본값)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Main Dialogue Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 shrink-0 flex flex-col justify-stretch">
        <div className="flex-1 bg-white border border-slate-150 rounded-2xl p-4 md:p-5 flex flex-col items-center justify-between min-h-[340px] shadow-2xs relative overflow-hidden">
          
          {currentDialog ? (
            <div className="w-full h-full flex flex-col justify-between">
              {/* Top Scrollable Content */}
              <div className="flex-1 overflow-y-auto w-full pr-1 scrollbar-thin">
                {!revealTranslation ? (
                  /* Hidden script state / listening animation */
                  <div className="flex flex-col items-center justify-center py-4 text-center space-y-4 animate-fade-in">
                    <div className={`p-5 rounded-full ${
                      isSpeakingTts ? 'bg-teal-50 text-teal-600 ring-8 ring-teal-50/50 animate-pulse' : 'bg-slate-50 text-slate-400'
                    } transition-all`}>
                      <Ear size={42} className={isSpeakingTts ? 'scale-105 transition-transform' : ''} />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-slate-800">영어 음성에만 귀 기울여보세요!</h3>
                      <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed font-normal">
                        설정한 목표 반복 횟수({targetRepeatCount}번) 동안 원어민 속도의 대화를 경청하며 섀도잉해보세요.
                      </p>
                    </div>

                    {/* Audio wave simulated lines */}
                    <div className="flex items-center gap-1.5 px-4 h-6">
                      {Array.from({ length: 6 }).map((_, index) => {
                        const isActive = isSpeakingTts && !isPaused;
                        return (
                          <div
                            key={index}
                            className={`w-1 rounded-full bg-teal-600 transition-all duration-300 ${
                              isActive
                                ? `h-5 ${index % 2 === 0 ? 'animate-bounce-custom-1' : 'animate-bounce-custom-2'}`
                                : 'h-1.5 bg-slate-350'
                            }`}
                            style={{
                              animationDelay: `${index * 120}ms`,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Animated speaker speaker indicator */}
                    {activeSpeaker && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-100 text-teal-700 text-[10px] uppercase tracking-wider font-extrabold rounded-full animate-bounce">
                        <AudioLines size={12} className="animate-pulse" />
                        <span>Speaker {activeSpeaker} speaking...</span>
                      </div>
                    )}

                    {/* Quick reveal shortcut button */}
                    <button
                      onClick={() => {
                        unlockAudioForMobile();
                        setRevealTranslation(true);
                        setHintLevel(1);
                      }}
                      className="text-[11px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-150/80 px-4 py-1.5 rounded-full flex items-center gap-1 mx-auto cursor-pointer shadow-3xs transition-all active:scale-95"
                    >
                      <Eye size={12} />
                      <span>힌트보기</span>
                    </button>
                  </div>
                ) : (
                  /* Revealed transcript with translations */
                  <div className="space-y-3.5 animate-fade-in">
                    
                    {/* 점진적 힌트 단계 선택기 - 추가 기능 3 */}
                    <div className="bg-slate-50 border border-slate-150/80 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500">
                        <span className="flex items-center gap-1">💡 점진적 힌트 선택</span>
                        <span className="text-teal-600 bg-teal-55 px-1.5 py-0.5 rounded text-[10px] font-extrabold border border-teal-100/50">
                          {hintLevel === 1 && "1단계: 한국어만"}
                          {hintLevel === 2 && "2단계: 핵심 패턴만"}
                          {hintLevel === 3 && "3단계: 빈칸 채우기"}
                          {hintLevel === 4 && "4단계: 전체 대본"}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { level: 1, label: '1단계', desc: '한글만' },
                          { level: 2, label: '2단계', desc: '패턴만' },
                          { level: 3, label: '3단계', desc: '빈칸채우기' },
                          { level: 4, label: '4단계', desc: '전체공개' }
                        ].map((h) => (
                          <button
                            key={h.level}
                            onClick={() => {
                              unlockAudioForMobile();
                              setHintLevel(h.level);
                            }}
                            className={`py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer flex flex-col items-center justify-center ${
                              hintLevel === h.level
                                ? 'bg-teal-600 border-teal-600 text-white shadow-3xs scale-102'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{h.label}</span>
                            <span className="opacity-85 text-[8px] font-normal leading-none mt-0.5">{h.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {currentDialog.english.map((englishSentence, idx) => {
                        const isA = idx % 2 === 0;
                        const speakerLabel = isA ? 'A' : 'B';
                        const bubbleColorClass = isA 
                          ? 'bg-teal-500/5 hover:bg-teal-500/10 border-teal-100/50' 
                          : 'bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-150/50';
                        const badgeColorClass = isA ? 'bg-teal-600' : 'bg-indigo-600';

                        return (
                          <div
                            key={idx}
                            className={`p-3 border rounded-2xl transition-colors space-y-1.5 ${bubbleColorClass}`}
                          >
                            {/* Speaker Badge */}
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className={`w-5 h-5 rounded-full ${badgeColorClass} text-white flex items-center justify-center font-extrabold text-[10px]`}>
                                {speakerLabel}
                              </span>
                              <span className="font-bold text-slate-700 text-[11px]">
                                Speaker {speakerLabel}
                              </span>
                            </div>

                            {/* Dialog Text */}
                            <p className="font-extrabold text-slate-800 text-[14px] md:text-[15px] leading-snug break-words">
                              {hintLevel === 1 ? (
                                <span className="text-slate-350 italic text-[12px] font-normal tracking-wide">
                                  (대본 숨김 처리됨 - 2~4단계를 선택하세요)
                                </span>
                              ) : (
                                getHintedEnglish(englishSentence, hintLevel)
                              )}
                            </p>

                            {/* Korean Translation */}
                            <p className="text-xs text-teal-700 font-semibold leading-normal">
                              {currentDialog.korean[idx]}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Auto Proceed Alert inside Script box */}
                    {autoProceedCountdown !== null && (
                      <div className="text-center p-2 bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-extrabold rounded-lg animate-pulse">
                        ⏰ {autoProceedCountdown}초 후 다음 대화 화면으로 이동합니다...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 하단 자가 평가 바 - 추가 기능 1 */}
              <div className="mt-3 pt-3 border-t border-slate-100 w-full shrink-0">
                <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                  <span>이 대화 기억난이도 평가 📝</span>
                  {dialogStatus[currentIndex] && dialogStatus[currentIndex] !== 'NONE' && (
                    <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-1.5 py-0.5 rounded">등록됨</span>
                  )}
                </div>
                <div className="flex gap-1.5 justify-center">
                  {[
                    { key: 'KNOW' as const, label: '알아요 😊', bg: 'bg-emerald-50 border-emerald-150 text-emerald-700', activeBg: 'bg-emerald-600 text-white border-emerald-600' },
                    { key: 'CONFUSED' as const, label: '헷갈려요 🤔', bg: 'bg-amber-50 border-amber-150 text-amber-700', activeBg: 'bg-amber-500 text-white border-amber-500' },
                    { key: 'WRONG' as const, label: '몰라요 😭', bg: 'bg-rose-50 border-rose-150 text-rose-700', activeBg: 'bg-rose-600 text-white border-rose-600' }
                  ].map((btn) => {
                    const isActive = dialogStatus[currentIndex] === btn.key;
                    return (
                      <button
                        key={btn.key}
                        onClick={() => handleUpdateStatus(currentIndex, btn.key)}
                        className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] md:text-[11px] font-bold border transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1 active:scale-95 ${
                          isActive ? btn.activeBg : `${btn.bg} hover:bg-slate-100`
                        }`}
                      >
                        <span>{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 text-xs py-10 w-full">
              학습용 데이터가 비어 있습니다.
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Player Controller Panel */}
      <div className="bg-white border-t border-slate-100 px-5 py-3 shrink-0 safe-bottom">
        <div className="flex items-center justify-evenly max-w-sm mx-auto">
          {/* Replay current button */}
          <button
            onClick={handleReplay}
            className="p-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full hover:bg-slate-150 active:bg-slate-200 transition-all cursor-pointer shadow-2xs"
            title="처음부터 대화 다시듣기"
            id="btn-action-replay"
          >
            <RotateCcw size={16} />
          </button>

          {/* Previous Arrow Button */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-2.5 border rounded-full transition-all cursor-pointer shadow-2xs ${
              currentIndex === 0
                ? 'bg-slate-50 border-slate-100 text-slate-300 pointer-events-none'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'
            }`}
            title="이전 대화"
            id="btn-action-prev"
          >
            <SkipBack size={18} />
          </button>

          {/* Core Big Play / Pause FAB */}
          <button
            onClick={handlePlayPause}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all scale-105 active:scale-95 cursor-pointer text-white ${
              isPlaying && !isPaused
                ? 'bg-amber-600 hover:bg-amber-700 ring-4 ring-amber-550/20'
                : 'bg-teal-600 hover:bg-teal-700 ring-4 ring-teal-550/20'
            }`}
            title={isPlaying && !isPaused ? '일시정지' : '재생'}
            id="btn-action-play-pause"
          >
            {isPlaying && !isPaused ? <Pause size={22} /> : <Play size={22} className="translate-x-0.5" />}
          </button>

          {/* Next Arrow Button */}
          <button
            onClick={handleNext}
            disabled={!randomPlay && currentIndex === dialogs.length - 1}
            className={`p-2.5 border rounded-full transition-all cursor-pointer shadow-2xs ${
              (!randomPlay && currentIndex === dialogs.length - 1)
                ? 'bg-slate-50 border-slate-100 text-slate-300 pointer-events-none'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100'
            }`}
            title="다음 대화"
            id="btn-action-next"
          >
            <SkipForward size={18} />
          </button>

          {/* Status speaker layout */}
          <div
            className={`p-2.5 border rounded-full transition-all ${
              isPlaying && !isPaused
                ? 'bg-teal-50 border-teal-100 text-teal-600 animate-pulse'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title="스피커 상태"
          >
            <Volume2 size={16} />
          </div>
        </div>

        <div className="text-center mt-2 text-[10px] font-bold text-slate-400 tracking-wide uppercase">
          {isPlaying && !isPaused ? '🎧 원어민 음성 재생 및 암기 반복 학습 중...' : '⏸️ 재생 일시정지됨. 조작 대기'}
        </div>
      </div>
    </div>
  );
}
