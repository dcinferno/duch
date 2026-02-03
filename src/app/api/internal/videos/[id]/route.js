export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongodb";
import Videos from "@/models/videos";
import Creators from "@/models/creators";
import {
  fetchActiveDiscounts,
  sanitizeDiscounts,
  getDiscountsForVideo,
  applyDiscount,
  formatDiscountResponse,
} from "@/lib/discounts";

const CDN = process.env.CDN_URL || "";

function withCDN(path) {
  if (!path || !CDN) return path;
  if (path.startsWith("http")) return path;
  return `${CDN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function isAuthorized(req) {
  const legacy = req.headers.get("x-internal-secret");
  const authHeader = req.headers.get("authorization");

  let bearer = null;
  if (authHeader?.startsWith("Bearer ")) {
    bearer = authHeader.slice(7).trim();
  }

  const token = bearer || legacy;
  const expected = process.env.INTERNAL_API_TOKEN;

  if (!expected || !token || token !== expected) {
    return false;
  }

  return true;
}

/**
 * GET /api/internal/videos/[id]
 *
 * Internal endpoint for external services (e.g., checkout server)
 * Returns full video data including creatorTelegramId
 */
export async function GET(req, { params }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing video id" }, { status: 400 });
  }

  await connectToDB();

  const video = await Videos.findById(id, { password: 0 }).lean();

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Fetch discounts and creator data
  const discounts = await fetchActiveDiscounts();
  const safeDiscounts = sanitizeDiscounts(discounts);

  const creator = await Creators.findOne(
    { name: video.creatorName },
    { telegramId: 1, premium: 1, pay: 1, urlHandle: 1 }
  ).lean();

  const basePrice = Number(video.price) || 0;
  const discountsForVideo = getDiscountsForVideo(video, safeDiscounts);
  const pricing = applyDiscount({ basePrice, discounts: discountsForVideo });

  // Remove internal fields
  delete video.discounts;

  return NextResponse.json({
    ...video,
    thumbnail: withCDN(video.thumbnail),
    url: withCDN(video.url),
    fullKey: Boolean(video.fullKey),
    premium: creator?.premium ?? false,
    pay: creator?.pay ?? false,
    creatorUrlHandle: creator?.urlHandle ?? null,
    creatorTelegramId: creator?.telegramId ?? null,
    price: Number(video.price) || 0,
    basePrice: pricing.basePrice,
    finalPrice: pricing.finalPrice,
    discount: formatDiscountResponse(pricing.appliedDiscount),
  });
}
