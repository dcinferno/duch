export const runtime = "nodejs";
import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js";
import {
  fetchActiveDiscounts,
  sanitizeDiscounts,
  getDiscountsForVideo,
  applyDiscount,
  formatDiscountResponse,
} from "../../../lib/discounts.js";

const CDN = process.env.CDN_URL || "";

/* ------------------------------------------
   PATH NORMALIZATION
------------------------------------------- */
function normalizePath(input) {
  if (!input) return input;
  if (input.startsWith("http")) {
    try {
      return new URL(input).pathname;
    } catch {
      return input;
    }
  }
  return input;
}

function normalizeFullKey(key) {
  if (!key) return null;
  return key.startsWith("/") ? key : `/${key}`;
}

function withCDN(path) {
  if (!path || !CDN) return path;
  if (path.startsWith("http")) return path;
  return `${CDN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function buildCreatorMap(creators) {
  return Object.fromEntries(
    creators.map((c) => [
      c.name?.trim().toLowerCase(),
      {
        premium: Boolean(c.premium),
        pay: Boolean(c.pay),
        urlHandle: c.urlHandle ?? null,
      },
    ]),
  );
}

/* ------------------------------------------
   GET /api/videos
------------------------------------------- */
export async function GET(request) {
  await connectToDB();

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("id");
  const creatorHandle = searchParams.get("creator");

  // -----------------------------------
  // 1️⃣ SINGLE VIDEO — parallel fetch video + discounts + creators
  // -----------------------------------
  if (videoId) {
    const [video, discounts, creators] = await Promise.all([
      Videos.findById(videoId, { password: 0 }).lean(),
      fetchActiveDiscounts(),
      Creators.find({}, { name: 1, premium: 1, pay: 1, urlHandle: 1 }).lean(),
    ]);

    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    delete video.discounts;
    const safeDiscounts = sanitizeDiscounts(discounts);
    const creatorMap = buildCreatorMap(creators);

    const creatorKey = video.creatorName?.trim().toLowerCase();
    const creator = creatorMap[creatorKey] || {};
    const basePrice = Number(video.price) || 0;
    const discountsForVideo = getDiscountsForVideo(video, safeDiscounts);

    const pricing = applyDiscount({
      basePrice,
      discounts: discountsForVideo,
    });

    return Response.json({
      ...video,
      thumbnail: withCDN(video.thumbnail),
      url: withCDN(video.url),
      fullKey: Boolean(video.fullKey),
      premium: creator.premium ?? false,
      pay: creator.pay ?? false,
      creatorUrlHandle: creator.urlHandle ?? null,
      price: Number(video.price) || 0,
      basePrice: pricing.basePrice,
      finalPrice: pricing.finalPrice,
      discount: formatDiscountResponse(pricing.appliedDiscount),
    });
  }

  // -----------------------------------
  // 2️⃣ BUILD QUERY
  // -----------------------------------
  let videoQuery = {};

  if (creatorHandle) {
    const creator = await Creators.findOne(
      { urlHandle: creatorHandle },
      { name: 1 },
    ).lean();

    if (!creator) {
      return Response.json({ videos: [] });
    }
    videoQuery.creatorName = creator.name;
  }

  // -----------------------------------
  // 3️⃣ FETCH ALL VIDEOS — parallel fetch videos + discounts + creators
  // -----------------------------------
  const [videos, discounts, creators] = await Promise.all([
    Videos.find(videoQuery, { password: 0 }).lean(),
    fetchActiveDiscounts(),
    Creators.find({}, { name: 1, premium: 1, pay: 1, urlHandle: 1 }).lean(),
  ]);

  const safeDiscounts = sanitizeDiscounts(discounts);
  const creatorMap = buildCreatorMap(creators);

  const mergedVideos = videos.map((video) => {
    delete video.discounts;
    const creatorKey = video.creatorName?.trim().toLowerCase();
    const creator = creatorMap[creatorKey] || {};
    const basePrice = Number(video.price) || 0;
    const discountsForVideo = getDiscountsForVideo(video, safeDiscounts);

    const pricing = applyDiscount({
      basePrice,
      discounts: discountsForVideo,
    });

    return {
      ...video,
      thumbnail: withCDN(video.thumbnail),
      url: withCDN(video.url),
      fullKey: Boolean(video.fullKey),
      premium: creator.premium ?? false,
      pay: creator.pay ?? false,
      creatorUrlHandle: creator.urlHandle ?? null,
      price: Number(video.price) || 0,
      basePrice: pricing.basePrice,
      finalPrice: pricing.finalPrice,
      discount: formatDiscountResponse(pricing.appliedDiscount),
    };
  });
  return Response.json(mergedVideos, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
/* ------------------------------------------
   POST — CREATE VIDEO
------------------------------------------- */
export async function POST(request) {
  try {
    await connectToDB();

    const {
      title,
      description,
      thumbnail,
      price,
      creatorName,
      url,
      tags,
      duration,
      fullKey,
    } = await request.json();

        if (!creatorName?.trim()) {
      return Response.json({ error: "creatorName is required" }, { status: 400 });
    }

    const creator = await Creators.findOne({
      name: new RegExp(`^${creatorName.trim()}$`, "i"),
    });

    if (!creator) {
      return Response.json({ error: "Creator not found" }, { status: 400 });
    }
    const normalizedFullKey = normalizeFullKey(fullKey);
    const video = await Videos.create({
      title,
      description,
      thumbnail: normalizePath(thumbnail),
      price: Number(price),
      creatorName: creator.name,
      socialMediaUrl: creator.url,
      url: normalizePath(url),
      fullKey: normalizedFullKey,
      tags,
      duration,
      pay: creator.pay || false,
      premium: creator.premium || false,
    });

      const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL 
    //create telegram message
       // fire-and-forget telegram notify
    fetch(`${baseUrl}/api/telegram/${video._id}`).catch((err) => {
      console.error("⚠️ Telegram notify failed:", err);
    });
    return Response.json(video, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating video:", err);
    return Response.json({ error: "Failed to create video" }, { status: 500 });
  }
}
