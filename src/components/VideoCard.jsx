"use client";

import { memo, useState, useRef, useCallback } from "react";
import { track } from "@vercel/analytics";
import { formatDate, formatDuration, getDisplayPrice, canPay } from "@/lib/videoUtils";
import { startCheckout } from "@/lib/startCheckout";

/**
 * VideoCard component - displays a single video in the grid
 *
 * @param {Object} props
 * @param {Object} props.video - The video object
 * @param {boolean} props.isPurchased - Whether the video has been purchased
 * @param {boolean} props.isLoading - Whether the video is currently loading
 * @param {number} props.viewCount - Number of views for this video
 * @param {boolean} props.isCopied - Whether the share link was just copied
 * @param {boolean} props.showCreatorPageLink - Whether to show link to creator page
 * @param {Function} props.onPreview - Callback when preview button is clicked
 * @param {Function} props.onShare - Callback when share button is clicked
 * @param {Function} props.onMouseEnter - Callback for mouse enter (preloading)
 */
function VideoCard({
  video,
  isPurchased = false,
  isLoading = false,
  viewCount = 0,
  isCopied = false,
  showCreatorPageLink = true,
  onPreview,
  onShare,
  onMouseEnter,
}) {
  const thumbSrc = video.type === "image" ? video.url : video.thumbnail;
  const displayPrice = getDisplayPrice(video);
  const hasDiscount = video.finalPrice < video.basePrice;
  const showPayButton = canPay(video);

  // Hover preview state
  const [showPreview, setShowPreview] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimerRef = useRef(null);
  const videoRef = useRef(null);
  const canPreview = video.type === "video" && video.url;

  const handleThumbEnter = useCallback(() => {
    if (!canPreview) return;
    setIsHovering(true);
    onMouseEnter?.();
    hoverTimerRef.current = setTimeout(() => {
      setShowPreview(true);
      track("thumbnail_preview", { videoId: video._id, creator: video.creatorName });
    }, 800);
  }, [canPreview, onMouseEnter]);

  const handleThumbLeave = useCallback(() => {
    clearTimeout(hoverTimerRef.current);
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    setShowPreview(false);
  }, []);

  return (
    <div
      id={`video-${video._id}`}
      className="bg-gray-900 shadow-lg rounded-xl overflow-hidden transition hover:shadow-[0_0_18px_rgba(59,130,246,0.4)] flex flex-col"
      onMouseEnter={!canPreview ? onMouseEnter : undefined}
    >
      {/* THUMBNAIL */}
      <div
        className="relative w-full h-64 sm:h-72"
        onMouseEnter={handleThumbEnter}
        onMouseLeave={handleThumbLeave}
      >
        <img
          src={thumbSrc}
          alt={video.title}
          className={`w-full h-full object-cover transition-opacity duration-300 ${showPreview ? "opacity-0" : "opacity-100"}`}
          loading="lazy"
        />
        {/* Hover overlay: darken + play icon */}
        {canPreview && isHovering && !showPreview && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity duration-200">
            <svg
              className="w-14 h-14 text-white/80 drop-shadow-lg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
        {showPreview && (
          <video
            ref={videoRef}
            src={video.url}
            muted
            autoPlay
            playsInline
            loop
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Play badge — visible by default, disappears when hover overlay or preview is active */}
        {canPreview && !showPreview && !isHovering && (
          <span className="absolute top-2 right-2 bg-black bg-opacity-75 text-white rounded p-1 pointer-events-none">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        )}
        {video.type === "video" && video.duration && !showPreview && (
          <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex-1">
          {/* Title row */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-gray-100">
              {video.title}
            </h3>
            {video.premium && (
              <span className="text-blue-600 font-semibold">
                💎
              </span>
            )}
          </div>

          {/* Date */}
          <p className="text-xs text-gray-500 mb-2">
            {formatDate(video.createdAt)}
          </p>

          {/* Description */}
          <p className="text-sm text-gray-400 line-clamp-3 mb-2">
            {video.description}
          </p>

          {/* Views and Share */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>{viewCount} views</span>
            <button
              onClick={onShare}
              className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors"
              title="Copy link"
            >
              {isCopied ? (
                <span className="text-green-600">✓ Copied</span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  Share
                </>
              )}
            </button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-2">
            {video.tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* PRICE + CREATOR */}
          <div className="flex items-center justify-between text-sm text-gray-400 min-w-0">
            <div className="flex items-center gap-1">
              <a
                href={video.socialMediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-400 hover:underline shrink-0"
              >
                {video.creatorName}
              </a>
              {showCreatorPageLink && video.creatorUrlHandle && (
                <>
                  <span className="mx-1 text-blue-600 shrink-0">·</span>
                  <a
                    href={`/${video.creatorUrlHandle}`}
                    className="text-blue-600 hover:underline truncate whitespace-nowrap overflow-hidden"
                    title="View Creator Page"
                  >
                    View Page
                  </a>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasDiscount ? (
                <>
                  <span className="line-through text-gray-400">
                    ${Number(video.basePrice ?? video.price ?? 0).toFixed(2)}
                  </span>
                  <span className="font-semibold text-gray-200">
                    ${displayPrice.toFixed(2)}
                  </span>
                  <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full">
                    {video.discount?.percentOff
                      ? `${video.discount.percentOff}% OFF`
                      : "SALE"}
                  </span>
                </>
              ) : (
                <span className="font-medium text-gray-200">
                  {displayPrice === 0 ? "Free" : `$${displayPrice.toFixed(2)}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-3 flex flex-col gap-2 w-full">
          {isPurchased ? (
            <button
              onClick={onPreview}
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
                isLoading
                  ? "bg-green-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Loading…
                </>
              ) : (
                "▶ Watch Full Video"
              )}
            </button>
          ) : (
            <>
              <button
                onClick={onPreview}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Preview
              </button>
              {showPayButton && (
                <button
                  onClick={() => startCheckout(video)}
                  className="w-full bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  Pay ${displayPrice.toFixed(2)}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(VideoCard);
