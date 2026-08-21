import React, { useState } from "react";
import { ArrowRight, ChevronDown, Compass, Scale, ZoomIn } from "lucide-react";
import { UntangleNode } from "../types";

interface NodeExtras {
  onDrill?: (node: UntangleNode) => void;
}

/** Detail text plus a tap-to-reveal "why" layer, and a "zoom in" drill-down trigger. */
function ExpandableDetail({ node, onDrill }: { node: UntangleNode } & NodeExtras) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="node-detail">{node.detail}</div>
      <div className="node-actions">
        {node.why && (
          <button
            className="why-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          >
            {open ? "Hide reasoning" : "Why?"}
            <ChevronDown size={12} className={`why-chevron ${open ? "open" : ""}`} />
          </button>
        )}
        {onDrill && (
          <button
            className="drill-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onDrill(node);
            }}
          >
            Zoom in <ZoomIn size={12} />
          </button>
        )}
      </div>
      {node.why && (
        <div className={`why-panel ${open ? "open" : ""}`}>
          <div className="why-panel-inner">{node.why}</div>
        </div>
      )}
    </>
  );
}

export function Timeline({
  nodes,
  revealed,
  onDrill,
}: {
  nodes: UntangleNode[];
  revealed: boolean;
} & NodeExtras) {
  return (
    <div className="timeline">
      <div className={`timeline-spine ${revealed ? "grown" : ""}`} />
      {nodes.map((n, i) => (
        <div
          className={`timeline-node ${revealed ? "shown" : ""}`}
          style={{ transitionDelay: `${260 + i * 160}ms` }}
          key={i}
        >
          <div className="timeline-dot" />
          <div className="timeline-card">
            <div className="node-meta">{n.meta}</div>
            <div className="node-label">{n.label}</div>
            <ExpandableDetail node={n} onDrill={onDrill} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Tree({
  nodes,
  headline,
  revealed,
  onDrill,
}: {
  nodes: UntangleNode[];
  headline: string;
  revealed: boolean;
} & NodeExtras) {
  return (
    <div className="tree">
      <div className={`tree-root ${revealed ? "shown" : ""}`}>{headline}</div>
      <div className={`tree-stem ${revealed ? "grown" : ""}`} />
      <div className={`tree-bar ${revealed ? "grown" : ""}`} />
      <div className="tree-branches">
        {nodes.map((n, i) => (
          <div className="tree-branch-col" key={i}>
            <div className={`tree-drop ${revealed ? "grown" : ""}`} style={{ transitionDelay: "300ms" }} />
            <div
              className={`tree-card ${revealed ? "shown" : ""}`}
              style={{ transitionDelay: `${420 + i * 150}ms` }}
            >
              <div className="node-meta">{n.meta}</div>
              <div className="node-label">{n.label}</div>
              <ExpandableDetail node={n} onDrill={onDrill} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScaleView({
  nodes,
  revealed,
  onDrill,
}: {
  nodes: UntangleNode[];
  revealed: boolean;
} & NodeExtras) {
  const forItems = nodes.filter((n) => n.meta === "for");
  const againstItems = nodes.filter((n) => n.meta === "against");
  const diff = forItems.length - againstItems.length;
  const tilt = Math.max(-8, Math.min(8, diff * -4));

  return (
    <div className="scale">
      <div className="scale-beam-wrap">
        <div className="scale-beam" style={{ transform: revealed ? `rotate(${tilt}deg)` : "rotate(0deg)" }}>
          <Scale size={18} />
        </div>
      </div>
      <div className="scale-columns">
        <div className="scale-col">
          <div className="scale-col-label for-label">For</div>
          {forItems.map((n, i) => (
            <div
              className={`scale-chip for-chip ${revealed ? "shown" : ""}`}
              style={{ transitionDelay: `${300 + i * 130}ms` }}
              key={i}
            >
              <div className="node-label">{n.label}</div>
              <ExpandableDetail node={n} onDrill={onDrill} />
            </div>
          ))}
        </div>
        <div className="scale-col">
          <div className="scale-col-label against-label">Against</div>
          {againstItems.map((n, i) => (
            <div
              className={`scale-chip against-chip ${revealed ? "shown" : ""}`}
              style={{ transitionDelay: `${300 + i * 130}ms` }}
              key={i}
            >
              <div className="node-label">{n.label}</div>
              <ExpandableDetail node={n} onDrill={onDrill} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Comparison({
  nodes,
  revealed,
  onDrill,
}: {
  nodes: UntangleNode[];
  revealed: boolean;
} & NodeExtras) {
  return (
    <div className="comparison">
      {nodes.map((n, i) => (
        <div
          className={`comparison-card ${revealed ? "shown" : ""}`}
          style={{ transitionDelay: `${260 + i * 160}ms` }}
          key={i}
        >
          <div className="node-label big">{n.label}</div>
          <div className="node-meta pill">{n.meta}</div>
          <ExpandableDetail node={n} onDrill={onDrill} />
        </div>
      ))}
    </div>
  );
}

export function NextStepCallout({ text, revealed }: { text: string; revealed: boolean }) {
  if (!text) return null;
  return (
    <div className={`next-step ${revealed ? "shown" : ""}`}>
      <div className="next-step-icon">
        <Compass size={16} />
      </div>
      <div>
        <div className="next-step-label">Do this next</div>
        <div className="next-step-text">{text}</div>
      </div>
    </div>
  );
}

export function FollowUps({
  items,
  revealed,
  onPick,
}: {
  items: string[];
  revealed: boolean;
  onPick: (q: string) => void;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="followups">
      <div className="followups-label">Keep exploring</div>
      <div className="followups-list">
        {items.map((q, i) => (
          <button
            key={i}
            className={`followup-chip ${revealed ? "shown" : ""}`}
            style={{ transitionDelay: `${100 + i * 90}ms` }}
            onClick={() => onPick(q)}
          >
            <span>{q}</span>
            <ArrowRight size={13} />
          </button>
        ))}
      </div>
    </div>
  );
}
