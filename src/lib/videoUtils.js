/**
 * Video utility functions - pure functions for easy testing
 */

/**
 * Format a date relative to now (Today, Yesterday, X days ago, or full date)
 */
export function formatDate(dateInput) {
  if (!dateInput) return "";
  const d = new Date(dateInput.$date || dateInput);
  const diff = Date.now() - d;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get the display price for a video (handles discount pricing)
 */
export function getDisplayPrice(video) {
  const price =
    video.displayPrice ??
    video.finalPrice ??
    video.basePrice ??
    video.price ??
    0;

  return Number(price);
}

/**
 * Check if a video is discounted
 */
export function isDiscounted(video) {
  const base =
    typeof video.basePrice === "number"
      ? video.basePrice
      : Number(video.price) || 0;

  const final =
    typeof video.finalPrice === "number" ? video.finalPrice : base;

  return final < base;
}

/**
 * Check if a video can be purchased
 */
export function canPay(video) {
  return video.pay && !!video.fullKey && getDisplayPrice(video) > 0;
}
