import React from "react";
import { BrandMark } from "./BrandMark";

const THINKING_LINES = [
  "Untangling…",
  "Following the thread…",
  "Finding the shape of this…",
  "Almost clear…",
];

export { THINKING_LINES };

export function BootLoader() {
  return (
    <div className="boot-screen">
      <div className="boot-mark">
        <BrandMark size={72} drawIn spinning />
      </div>
      <div className="boot-word">
        Un<span>tangle</span>
      </div>
      <div className="boot-sub">one question. one clear picture.</div>
    </div>
  );
}

export function ThinkingLoader({ line }: { line: string }) {
  return (
    <div className="loading-wrap">
      <div className="loading-mark-wrap">
        <BrandMark size={64} spinning />
      </div>
      <div className="loading-line">{line}</div>
      <div className="loading-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
