import React from "react";
import { AlertTriangle, FileImage, Sparkles, X } from "lucide-react";
import { Persona, PERSONAS, StakesLevel } from "../types";

export function PersonaPicker({
  value,
  onChange,
}: {
  value: Persona;
  onChange: (p: Persona) => void;
}) {
  return (
    <div className="persona-picker">
      <div className="persona-label">
        <Sparkles size={12} /> Answer in the voice of…
      </div>
      <div className="persona-options">
        {PERSONAS.map((p, i) => (
          <button
            key={p.id}
            className={`persona-card ${value === p.id ? "active" : ""}`}
            style={{ animationDelay: `${2.3 + i * 0.1}s` }}
            onClick={() => onChange(p.id)}
          >
            <div className="persona-card-label text-white text-bold">{p.label}</div>
            <div className="persona-card-desc">{p.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

const STAKES_CONFIG: Record<StakesLevel, { label: string; className: string }> = {
  low: { label: "Low stakes", className: "stakes-low" },
  medium: { label: "Medium stakes", className: "stakes-medium" },
  high: { label: "High stakes", className: "stakes-high" },
};

export function StakesBadge({ level, revealed }: { level: StakesLevel; revealed: boolean }) {
  const config = STAKES_CONFIG[level] || STAKES_CONFIG.medium;
  return (
    <div className={`stakes-badge ${config.className} ${revealed ? "shown" : ""}`}>
      {level === "high" && <AlertTriangle size={11} />}
      {config.label}
    </div>
  );
}

export function ImageAttachmentChip({
  name,
  previewUrl,
  onRemove,
}: {
  name: string;
  previewUrl: string;
  onRemove: () => void;
}) {
  return (
    <div className="image-chip">
      <img src={previewUrl} alt={name} className="image-chip-thumb" />
      <div className="image-chip-info">
        <FileImage size={12} />
        <span className="image-chip-name">{name}</span>
      </div>
      <button className="image-chip-remove" onClick={onRemove} title="Remove image">
        <X size={13} />
      </button>
    </div>
  );
}
