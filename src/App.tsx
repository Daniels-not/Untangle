import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Home, Mic, Paperclip, RotateCcw, Share2, Volume2, VolumeX } from "lucide-react";
import { askClaude } from "./api";
import { ContextTurn, Persona, StudentProfile, UntangleNode, UntangleResponse } from "./types";
import {
  HistoryEntry,
  delay,
  fileToBase64,
  loadHistory,
  loadProfile,
  saveHistory,
  saveProfile,
  useOnlineStatus,
  useReadAloud,
  useSequentialTypewriter,
  useTypedPlaceholder,
  useVoiceInput,
} from "./hooks";
import { BrandMark } from "./components/BrandMark";
import { BootLoader, ThinkingLoader, THINKING_LINES } from "./components/Loader";
import {
  Timeline,
  Tree,
  ScaleView,
  Comparison,
  NextStepCallout,
  FollowUps,
} from "./components/Visuals";
import { ShareCard } from "./components/ShareCard";
import { PersonaPicker, StakesBadge, ImageAttachmentChip } from "./components/Extras";
import { Onboarding } from "./components/Onboarding";
import "./App.css";

const EXAMPLES: string[] = [
  "Should I switch my major to CS this late?",
  "Is grad school worth it if I already have an offer?",
  "Study abroad or a summer internship?",
  "How do I even start applying to internships?",
];

type Stage = "landing" | "loading" | "result" | "error";

interface DrillLevel {
  question: string;
  label: string;
  data: UntangleResponse;
}

interface PendingImage {
  base64: string;
  mediaType: string;
  dataUrl: string;
  name: string;
}

const TITLE = "What are you stuck on right now?";
const SUBTITLE =
  "Ask one real question about school, majors, or what comes after. Untangle turns it into a single clear picture — not another wall of text.";

export default function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [question, setQuestion] = useState<string>("");
  const [revealed, setRevealed] = useState<boolean>(false);
  const [loadingLine, setLoadingLine] = useState<string>(THINKING_LINES[0]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [bootDone, setBootDone] = useState<boolean>(false);
  const isOnline = useOnlineStatus();

  const [drillStack, setDrillStack] = useState<DrillLevel[]>([]);
  const sessionContextRef = useRef<ContextTurn[]>([]);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [persona, setPersona] = useState<Persona>("counselor");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const readAloud = useReadAloud();

  const current = drillStack[drillStack.length - 1] || null;

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 1600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const existing = loadProfile();
    if (existing) {
      setProfile(existing);
    } else {
      const t = setTimeout(() => setShowOnboarding(true), 1700);
      return () => clearTimeout(t);
    }
  }, []);

  const { typedLines, done: introDone } = useSequentialTypewriter([TITLE, SUBTITLE], 16, 100, bootDone);
  const typedPlaceholder = useTypedPlaceholder(EXAMPLES, introDone && stage === "landing" && !question);

  const voice = useVoiceInput((transcript) => setQuestion(transcript));

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (stage !== "loading") return;
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % THINKING_LINES.length;
      setLoadingLine(THINKING_LINES[i]);
    }, 1400);
    return () => clearInterval(timer);
  }, [stage]);

  function completeOnboarding(p: StudentProfile) {
    setProfile(p);
    saveProfile(p);
    setShowOnboarding(false);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { base64, mediaType, dataUrl } = await fileToBase64(file);
      setPendingImage({ base64, mediaType, dataUrl, name: file.name });
    } catch {
      setPendingImage(null);
    }
  }

  async function runQuery(q: string, label: string, asNewRoot: boolean) {
    if (!q.trim() || !isOnline) return;

    setQuestion(q);
    setStage("loading");
    setRevealed(false);
    setErrorDetail("");
    readAloud.stop();

    const imageForRequest = pendingImage
      ? { base64: pendingImage.base64, mediaType: pendingImage.mediaType }
      : null;
    setPendingImage(null);

    const MIN_LOADING_MS = 1700;
    const startedAt = Date.now();
    async function settleWithMinimumDelay() {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) await delay(MIN_LOADING_MS - elapsed);
    }

    try {
      const result = await askClaude(q, {
        history: sessionContextRef.current,
        persona,
        profile,
        image: imageForRequest,
      });
      await settleWithMinimumDelay();

      sessionContextRef.current = [...sessionContextRef.current, { question: q, response: result }].slice(-3);

      setDrillStack((prev) => {
        const level: DrillLevel = { question: q, label, data: result };
        return asNewRoot ? [level] : [...prev, level];
      });
      setStage("result");

      if (asNewRoot) {
        const entry: HistoryEntry = { question: q, response: result, timestamp: Date.now() };
        const nextHistory = [entry, ...history.filter((h) => h.question !== q)];
        setHistory(nextHistory);
        saveHistory(nextHistory);
      }

      requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)));
    } catch (e) {
      await settleWithMinimumDelay();
      setErrorDetail(e instanceof Error ? e.message : "Unknown error");
      setStage("error");
    }
  }

  function handleSubmit(q?: string) {
    const finalQ = (q ?? question).trim();
    if (!finalQ) return;
    runQuery(finalQ, finalQ.length > 42 ? finalQ.slice(0, 42) + "…" : finalQ, true);
  }

  function handleDrill(node: UntangleNode) {
    const drillQuestion = `Zoom in on: "${node.label}" — ${node.detail}`;
    runQuery(drillQuestion, node.label, false);
  }

  function jumpToBreadcrumb(index: number) {
    setDrillStack((prev) => prev.slice(0, index + 1));
    setRevealed(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)));
  }

  function openHistoryEntry(entry: HistoryEntry) {
    setQuestion(entry.question);
    setDrillStack([{ question: entry.question, label: entry.question, data: entry.response }]);
    setStage("result");
    setRevealed(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)));
  }

  function reset() {
    setStage("landing");
    setDrillStack([]);
    setQuestion("");
    setRevealed(false);
    setPendingImage(null);
    readAloud.stop();
  }

  function handleReadAloud() {
    if (!current) return;
    if (readAloud.speaking) {
      readAloud.stop();
    } else {
      readAloud.speak(`${current.data.headline}. ${current.data.summary} Next step: ${current.data.nextStep}`);
    }
  }

  async function handleShare() {
    if (!shareCardRef.current) return;
    const htmlToImage = await import("html-to-image");
    const dataUrl = await htmlToImage.toPng(shareCardRef.current, { pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = "untangle.png";
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="app">
      <div className="bg-glow">
        <div className="bg-blob one" />
        <div className="bg-blob two" />
        <div className="bg-grain" />
        <div className="bg-vignette" />
      </div>

      <BootLoader />
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}

      <div className="header">
        <div className="wordmark">
          <BrandMark size={20} spinning />
          Un<span>tangle</span>
        </div>
        <div className="tagline">one question. one clear picture.</div>
      </div>

      {!isOnline && (
        <div className="offline-banner">
          You're offline — new questions need a connection, but anything you've already
          untangled is still right here below.
        </div>
      )}

      <div className="stage">
        {stage === "landing" && (
          <>
            <div className="landing-title">
              {typedLines[0]}
              {typedLines[0].length < TITLE.length && <span className="type-cursor" />}
            </div>
            <div className="landing-sub">
              {typedLines[1]}
              {typedLines[0].length === TITLE.length && typedLines[1].length < SUBTITLE.length && (
                <span className="type-cursor sub" />
              )}
            </div>

            {pendingImage && (
              <ImageAttachmentChip
                name={pendingImage.name}
                previewUrl={pendingImage.dataUrl}
                onRemove={() => setPendingImage(null)}
              />
            )}

            <div className="input-row">
              <input
                autoFocus
                placeholder={
                  isOnline
                    ? voice.listening
                      ? "Listening…"
                      : pendingImage
                      ? "Ask about this image, e.g. what should I take first?"
                      : introDone
                      ? typedPlaceholder
                      : ""
                    : "Reconnect to ask something new"
                }
                value={question}
                disabled={!isOnline}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImageSelect}
              />
              <button
                type="button"
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isOnline}
                title="Attach a course list, transcript, or degree plan image"
              >
                <Paperclip size={16} />
              </button>
              {voice.supported && (
                <button
                  type="button"
                  className={`mic-btn ${voice.listening ? "listening" : ""}`}
                  onClick={() => (voice.listening ? voice.stop() : voice.start())}
                  disabled={!isOnline}
                  title="Speak your question"
                >
                  <Mic size={17} />
                </button>
              )}
              <button
                className="go-btn"
                onClick={() => handleSubmit()}
                disabled={!question.trim() || !isOnline}
              >
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="examples">
              {EXAMPLES.map((ex, i) => (
                <div
                  className={`example-chip ${!isOnline ? "disabled" : ""}`}
                  key={i}
                  style={{ animationDelay: `${2.1 + i * 0.08}s` }}
                  onClick={() => isOnline && handleSubmit(ex)}
                >
                  {ex}
                </div>
              ))}
            </div>

            <PersonaPicker value={persona} onChange={setPersona} />

            {history.length > 0 && (
              <div className="recent-section">
                <div className="recent-label">{isOnline ? "Recently untangled" : "Available offline"}</div>
                {history.slice(0, 6).map((entry, i) => (
                  <button className="recent-item" key={i} onClick={() => openHistoryEntry(entry)}>
                    {entry.question}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {stage === "loading" && <ThinkingLoader line={loadingLine} />}

        {stage === "error" && (
          <div className="error-box">
            <div>That thread snapped. Mind trying again?</div>
            {errorDetail && <div className="error-detail">{errorDetail}</div>}
            <button className="again-btn" onClick={reset} style={{ marginTop: 20 }}>
              <RotateCcw size={14} /> Try again
            </button>
          </div>
        )}

        {stage === "result" && current && (
          <React.Fragment key={question}>
            {drillStack.length > 1 && (
              <div className="breadcrumb">
                <button className="breadcrumb-item" onClick={() => jumpToBreadcrumb(0)}>
                  <Home size={12} />
                </button>
                {drillStack.map((level, i) => (
                  <React.Fragment key={i}>
                    <span className="breadcrumb-sep">/</span>
                    <button
                      className={`breadcrumb-item ${i === drillStack.length - 1 ? "current" : ""}`}
                      onClick={() => jumpToBreadcrumb(i)}
                    >
                      {level.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="result-toolbar">
              {readAloud.supported && (
                <button className={`toolbar-btn ${readAloud.speaking ? "active" : ""}`} onClick={handleReadAloud}>
                  {readAloud.speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  {readAloud.speaking ? "Stop" : "Read aloud"}
                </button>
              )}
              <button className="toolbar-btn" onClick={handleShare}>
                <Share2 size={13} /> Share
              </button>
            </div>

            <div className="question-chip">{question}</div>
            <StakesBadge level={current.data.stakes} revealed={revealed} />
            <div className="headline">{current.data.headline}</div>
            <div className="summary">{current.data.summary}</div>

            {current.data.format === "timeline" && (
              <Timeline nodes={current.data.nodes} revealed={revealed} onDrill={handleDrill} />
            )}
            {current.data.format === "tree" && (
              <Tree
                nodes={current.data.nodes}
                headline="Your options branch here"
                revealed={revealed}
                onDrill={handleDrill}
              />
            )}
            {current.data.format === "scale" && (
              <ScaleView nodes={current.data.nodes} revealed={revealed} onDrill={handleDrill} />
            )}
            {current.data.format === "comparison" && (
              <Comparison nodes={current.data.nodes} revealed={revealed} onDrill={handleDrill} />
            )}

            <NextStepCallout text={current.data.nextStep} revealed={revealed} />
            <FollowUps items={current.data.followUps} revealed={revealed} onPick={(q) => handleSubmit(q)} />

            <button className="again-btn" onClick={reset}>
              <RotateCcw size={14} /> Ask something new
            </button>
          </React.Fragment>
        )}
      </div>

      {stage === "result" && current && <ShareCard ref={shareCardRef} question={question} data={current.data} />}
    </div>
  );
}
