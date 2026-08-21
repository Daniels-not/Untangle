import React, { forwardRef } from "react";
import { BrandMark } from "./BrandMark";
import { UntangleResponse } from "../types";

interface ShareCardProps {
  question: string;
  data: UntangleResponse;
}

/**
 * Rendered off-screen (see .share-card in App.css — positioned way outside
 * the viewport) so it never shows in the UI, but html-to-image can still
 * snapshot it into a downloadable PNG.
 */
export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({ question, data }, ref) => {
  return (
    <div className="share-card" ref={ref}>
      <div className="share-card-word">
        <BrandMark size={22} />
        Un<span>tangle</span>
      </div>
      <div className="share-card-question">{question}</div>
      <div className="share-card-headline">{data.headline}</div>
      <div className="share-card-summary">{data.summary}</div>
      <div className="share-card-footer">untangle — one question, one clear picture</div>
    </div>
  );
});

ShareCard.displayName = "ShareCard";
