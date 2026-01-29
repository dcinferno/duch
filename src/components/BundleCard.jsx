"use client";

import { useState } from "react";

export default function BundleCard({ bundle, onBuy, shouldCollapse = false }) {
  const [isExpanded, setIsExpanded] = useState(!shouldCollapse);

  const scrollToVideo = (videoId) => {
    const el = document.getElementById(`video-${videoId}`);
    if (!el) return;

    el.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-300 overflow-hidden bg-zinc-600">
      {/* HEADER */}
      <div className="px-5 py-4 bg-zinc-600">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              {shouldCollapse && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white hover:text-purple-300 transition-colors p-1 mt-0.5"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white break-words">
                  {bundle.name}
                </h3>
                <p className="text-sm text-zinc-100 mt-0.5">
                  {bundle.videoCount} videos included
                </p>
              </div>
            </div>
          </div>

          <span className="shrink-0 text-xs font-semibold text-purple-100 bg-purple-700/80 px-2 py-0.5 rounded-full h-fit">
            BUNDLE
          </span>
        </div>
      </div>

      {/* BODY */}
      {isExpanded && (
        <div className="px-5 py-4 bg-zinc-600">
          <ul className="space-y-1.5 text-sm text-white">
            {bundle.videos.map((video) => (
              <li
                key={video._id}
                className="break-words
                line-clamp-2
                cursor-pointer
                hover:text-purple-300
                hover:underline
                transition-colors"
                onClick={() => scrollToVideo(video._id)}
              >
                • {video.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FOOTER */}
      <div className="px-5 py-4 bg-zinc-600 flex items-center justify-center">
        <button
          onClick={onBuy}
          className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold"
        >
          Pay ${Number(bundle.price).toFixed(2)}
        </button>
      </div>
    </div>
  );
}
