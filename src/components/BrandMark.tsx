import React from "react";

interface BrandMarkProps {
  size?: number;
  /** Plays the "draw itself in" animation once, on mount. */
  drawIn?: boolean;
  /** Keeps slowly rotating forever (used for loaders). */
  spinning?: boolean;
}

/**
 * The Untangle mark: a gold ring and a smaller teal ring, each with a gap,
 * overlapping like a loose knot settling into place. Matches the generated
 * app icon (public/icon-512.png) but as real SVG so it can be animated.
 */
export function BrandMark({ size = 40, drawIn = false, spinning = false }: BrandMarkProps) {
  const outerR = 32;
  const innerR = 20;
  const outerCirc = 2 * Math.PI * outerR;
  const innerCirc = 2 * Math.PI * innerR;
  const outerArc = (240 / 360) * outerCirc; // 240° sweep, matching the app icon
  const innerArc = (240 / 360) * innerCirc;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`brand-mark ${spinning ? "brand-mark-spin" : ""}`}
    >
      <circle
        cx="50"
        cy="50"
        r={outerR}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${outerArc} ${outerCirc - outerArc}`}
        transform="rotate(140 50 50)"
        className={drawIn ? "brand-ring-draw brand-ring-outer" : ""}
        style={!drawIn ? undefined : { strokeDashoffset: outerArc }}
      />
      <circle
        cx="50"
        cy="50"
        r={innerR}
        fill="none"
        stroke="var(--teal)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${innerArc} ${innerCirc - innerArc}`}
        transform="rotate(300 50 50)"
        className={drawIn ? "brand-ring-draw brand-ring-inner" : ""}
        style={!drawIn ? undefined : { strokeDashoffset: innerArc }}
      />
      <circle cx="25.5" cy="70.6" r="3.4" fill="var(--gold)" className={drawIn ? "brand-dot" : ""} />
    </svg>
  );
}
