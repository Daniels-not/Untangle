import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { StudentProfile } from "../types";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Grad student"];
const FOCUSES = [
  "Still deciding",
  "STEM / Engineering",
  "Business",
  "Humanities / Arts",
  "Health / Pre-med",
  "Social Sciences",
];

export function Onboarding({ onComplete }: { onComplete: (profile: StudentProfile) => void }) {
  const [step, setStep] = useState<0 | 1>(0);
  const [year, setYear] = useState<string>("");
  const [focus, setFocus] = useState<string>("");

  function pickYear(y: string) {
    setYear(y);
    setStep(1);
  }

  function pickFocus(f: string) {
    setFocus(f);
    onComplete({ year, focus: f });
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-mark">
          <BrandMark size={36} />
        </div>
        {step === 0 && (
          <div className="onboarding-step" key="step0">
            <div className="onboarding-question">What year are you?</div>
            <div className="onboarding-options">
              {YEARS.map((y, i) => (
                <button
                  key={y}
                  className="onboarding-chip"
                  style={{ animationDelay: `${i * 0.06}s` }}
                  onClick={() => pickYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="onboarding-step" key="step1">
            <div className="onboarding-question">What's your focus?</div>
            <div className="onboarding-options">
              {FOCUSES.map((f, i) => (
                <button
                  key={f}
                  className="onboarding-chip"
                  style={{ animationDelay: `${i * 0.06}s` }}
                  onClick={() => pickFocus(f)}
                >
                  {f} <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          className="onboarding-skip"
          onClick={() => onComplete({ year: year || "", focus: focus || "" })}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
