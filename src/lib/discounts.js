/**
 * Shared discount utilities for video pricing
 */

/**
 * Check if a discount applies to a specific video based on tags
 */
export function discountAppliesToVideo(discount, video) {
  // No tag restriction → applies to all
  if (!Array.isArray(discount.tags) || discount.tags.length === 0) {
    return true;
  }

  // Video must have at least one matching tag
  if (!Array.isArray(video.tags)) return false;

  return discount.tags.some((tag) => video.tags.includes(tag));
}

/**
 * Get all applicable discounts for a video
 */
export function getDiscountsForVideo(video, safeDiscounts) {
  const list = [];

  // 🌍 Global discount
  if (safeDiscounts.global) {
    if (discountAppliesToVideo(safeDiscounts.global, video)) {
      list.push(safeDiscounts.global);
    }
  }

  // 👤 Creator discounts
  const creatorKey = video.creatorName?.trim().toLowerCase();
  const creatorDiscounts = safeDiscounts.creators?.[creatorKey];

  if (Array.isArray(creatorDiscounts)) {
    for (const d of creatorDiscounts) {
      if (discountAppliesToVideo(d, video)) {
        list.push(d);
      }
    }
  }

  return list;
}

/**
 * Apply discounts to get the best price
 */
export function applyDiscount({ basePrice, discounts = [] }) {
  let bestPrice = basePrice;
  let appliedDiscount = null;

  for (const d of discounts) {
    if (!d || !d.type) continue;

    let candidate = basePrice;

    // % off
    if (d.type === "percentage" && Number.isFinite(d.percentOff)) {
      candidate = basePrice * (1 - d.percentOff / 100);
    }

    // $ off
    if (d.type === "amount" && Number.isFinite(d.amountOff)) {
      candidate = basePrice - d.amountOff;
    }

    // flat price
    if (d.type === "fixed" && Number.isFinite(d.fixedPrice)) {
      candidate = d.fixedPrice;
    }

    // never go below zero
    candidate = Math.max(0, Number(candidate));

    // choose the lowest final price
    if (candidate < bestPrice) {
      bestPrice = candidate;
      appliedDiscount = d;
    }
  }

  return {
    basePrice,
    finalPrice: Number(bestPrice.toFixed(2)),
    appliedDiscount,
  };
}

/**
 * Fetch active discounts from the process server
 */
export async function fetchActiveDiscounts() {
  const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/discount/active`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      console.error("❌ Failed to fetch discounts", await res.text());
      return { global: null, creators: {} };
    }

    return res.json();
  } catch (err) {
    console.error("❌ Error fetching discounts", err);
    return { global: null, creators: {} };
  }
}

/**
 * Sanitize discount response to ensure correct structure
 */
export function sanitizeDiscounts(discounts) {
  return {
    global:
      discounts?.global &&
      typeof discounts.global === "object" &&
      !Array.isArray(discounts.global)
        ? discounts.global
        : null,

    creators:
      discounts?.creators &&
      typeof discounts.creators === "object" &&
      !Array.isArray(discounts.creators)
        ? discounts.creators
        : {},
  };
}

/**
 * Format discount for API response
 */
export function formatDiscountResponse(appliedDiscount) {
  if (!appliedDiscount) return null;

  return {
    label: appliedDiscount.name,
    type: appliedDiscount.type,
    percentOff: appliedDiscount.percentOff ?? null,
    amountOff: appliedDiscount.amountOff ?? null,
    fixedPrice: appliedDiscount.fixedPrice ?? null,
  };
}
