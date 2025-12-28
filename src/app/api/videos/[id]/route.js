// app/api/videos/[id]/route.js
export const runtime = "nodejs";

import { connectToDB } from "../../../../lib/mongodb.js";
import Videos from "../../../../models/videos";
import Creators from "../../../../models/creators";
import { fetchActiveDiscounts } from "../../../../lib/fetchActiveDiscounts";
const normalize = (s) => s?.trim().toLowerCase();

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(normalize);
}

function discountAppliesToVideo(discount, video) {
  if (!Array.isArray(discount.tags) || discount.tags.length === 0) {
    return true;
  }

  const videoTags = normalizeTags(video.tags);
  return discount.tags.some((t) => videoTags.includes(t));
}

function getDiscountsForVideo(video, safeDiscounts) {
  const list = [];

  if (
    safeDiscounts.global &&
    discountAppliesToVideo(safeDiscounts.global, video)
  ) {
    list.push(safeDiscounts.global);
  }

  const creatorKey = normalize(video.creatorName);
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

function applyDiscount({ basePrice, discounts = [] }) {
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

    candidate = Math.max(0, Number(candidate));

    // choose lowest final price
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

export async function GET(req, { params }) {
  await connectToDB();
  const { id } = await params;

  const video = await Videos.findById(id).lean();
  if (!video) {
    return new Response("Not found", { status: 404 });
  }

  const creator = await Creators.findOne(
    { name: video.creatorName },
    { premium: 1, pay: 1 }
  ).lean();

  // 🔑 FETCH DISCOUNTS HERE
  const discounts = await fetchActiveDiscounts();

  const basePrice = Number(video.price) || 0;
  const discountsForVideo = getDiscountsForVideo(video, discounts);

  const pricing = applyDiscount({
    basePrice,
    discounts: discountsForVideo,
  });
  return Response.json({
    ...video,
    premium: Boolean(creator?.premium),
    pay: Boolean(creator?.pay),

    price: basePrice,
    basePrice: pricing.basePrice,
    finalPrice: pricing.finalPrice,

    discount: pricing.appliedDiscount
      ? {
          label: pricing.appliedDiscount.name,
          type: pricing.appliedDiscount.type,
          percentOff: pricing.appliedDiscount.percentOff ?? null,
          amountOff: pricing.appliedDiscount.amountOff ?? null,
          fixedPrice: pricing.appliedDiscount.fixedPrice ?? null,
        }
      : null,
  });
}
