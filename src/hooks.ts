import { useEffect, useRef, useState } from "react";
import { StudentProfile, UntangleResponse } from "./types";

const PROFILE_KEY = "untangle_profile";

export function loadProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as StudentProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: StudentProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // non-critical — profile just won't persist across sessions
  }
}

export interface FileAsBase64 {
  base64: string;
  mediaType: string;
  dataUrl: string;
}

/** Reads an image File into a base64 string (for the Claude vision API) plus a data URL for preview. */
export function fileToBase64(file: File): Promise<FileAsBase64> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      resolve({ base64, mediaType: file.type || "image/png", dataUrl });
    };
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

export interface HistoryEntry {
  question: string;
  response: UntangleResponse;
  timestamp: number;
}

const HISTORY_KEY = "untangle_history";
const MAX_HISTORY = 20;

export function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage can fail in private browsing — safe to ignore, it's non-critical.
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return isOnline;
}

/**
 * Types out a list of lines in sequence — each line fully types out, then
 * the next one starts. Won't start until `enabled` is true, which lets the
 * boot screen finish first instead of racing it.
 */
export function useSequentialTypewriter(
  lines: string[],
  charSpeedMs: number,
  startDelayMs: number,
  enabled: boolean
) {
  const [lineIndex, setLineIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function typeLine(li: number, ci: number) {
      if (cancelled) return;
      if (li >= lines.length) {
        setDone(true);
        return;
      }
      const current = lines[li];
      if (ci <= current.length) {
        setLineIndex(li);
        setCharCount(ci);
        timer = setTimeout(() => typeLine(li, ci + 1), charSpeedMs);
      } else {
        timer = setTimeout(() => typeLine(li + 1, 0), 260);
      }
    }

    timer = setTimeout(() => typeLine(0, 0), startDelayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const typedLines = lines.map((line, i) => {
    if (i < lineIndex) return line;
    if (i === lineIndex) return line.slice(0, charCount);
    return "";
  });

  return { typedLines, done };
}

/**
 * A placeholder that continuously types then deletes through a list of
 * example strings. Pauses entirely once `active` is false.
 */
export function useTypedPlaceholder(examples: string[], active: boolean) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let exampleIndex = 0;

    function cycle(charIndex: number, deleting: boolean) {
      if (cancelled) return;
      const current = examples[exampleIndex % examples.length];

      if (!deleting) {
        setText(current.slice(0, charIndex));
        if (charIndex < current.length) {
          timer = setTimeout(() => cycle(charIndex + 1, false), 42);
        } else {
          timer = setTimeout(() => cycle(charIndex, true), 1600);
        }
      } else {
        setText(current.slice(0, charIndex));
        if (charIndex > 0) {
          timer = setTimeout(() => cycle(charIndex - 1, true), 20);
        } else {
          exampleIndex += 1;
          timer = setTimeout(() => cycle(0, false), 400);
        }
      }
    }

    timer = setTimeout(() => cycle(0, false), 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, examples]);

  return text;
}

// ============ VOICE INPUT ============

interface SpeechRecognitionResultLike {
  transcript: string;
}

/**
 * Wraps the browser's SpeechRecognition API (webkitSpeechRecognition on
 * Safari/Chrome). Not supported everywhere (notably Firefox), so callers
 * should check `supported` before showing a mic button.
 */
export function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const result: SpeechRecognitionResultLike = event.results[0][0];
      onResult(result.transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    if (!recognitionRef.current || listening) return;
    setListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      setListening(false);
    }
  }

  function stop() {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  }

  return { listening, supported, start, stop };
}

// ============ READ ALOUD ============

/** Wraps window.speechSynthesis to read a block of text aloud, with a stop control. */
export function useReadAloud() {
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  function speak(text: string) {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { speaking, supported, speak, stop };
}
