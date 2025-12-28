export const runtime = "nodejs";
import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js";
import { sendTelegramMessage } from "../../../lib/telegram.js";

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

function discountAppliesToVideo(discount, video) {
  // No tag restriction → applies to all
  if (!Array.isArray(discount.tags) || discount.tags.length === 0) {
    return true;
  }

  // Video must have at least one matching tag
  if (!Array.isArray(video.tags)) return false;

  return discount.tags.some((tag) => video.tags.includes(tag));
}

function getDiscountsForVideo(video, safeDiscounts) {
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
/* ------------------------------------------
   FETCH ACTIVE DISCOUNTS (PROCESS SERVER)
------------------------------------------- */
async function fetchActiveDiscounts() {
  const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/discount/active`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    console.error("❌ Failed to fetch discounts", await res.text());
    return { global: null, creators: {} };
  }

  return res.json();
}

/* ------------------------------------------
   GET /api/videos
------------------------------------------- */
export async function GET(request) {
  await connectToDB();
  const discounts = await fetchActiveDiscounts();

  const safeDiscounts = {
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

  const { searchParams } = new URL(request.url);

  const videoId = searchParams.get("id");
  const creatorHandle = searchParams.get("creator");

  const creators = await Creators.find(
    {},
    { name: 1, premium: 1, pay: 1, telegramId: 1 }
  ).lean();
  const creatorMap = Object.fromEntries(
    creators.map((c) => [
      c.name?.trim().toLowerCase(),
      {
        premium: Boolean(c.premium),
        pay: Boolean(c.pay),
        telegramId: c.telegramId ?? null,
      },
    ])
  );

  // -----------------------------------
  // 1️⃣ SINGLE VIDEO
  // -----------------------------------
  if (videoId) {
    const video = await Videos.findById(videoId, { password: 0 }).lean();
    delete video.discounts;
    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

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

      premium: creator.premium ?? false,
      pay: creator.pay ?? false,
      creatorTelegramId: creator.telegramId ?? null,

      price: Number(video.price) || 0,
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

  // -----------------------------------
  // 2️⃣ BUILD QUERY (THIS WAS BROKEN)
  // -----------------------------------

  let videoQuery = {};

  if (creatorHandle) {
    const creator = await Creators.findOne(
      { urlHandle: creatorHandle },
      { name: 1 }
    ).lean();

    if (!creator) {
      return Response.json({ videos: [] });
    }
    videoQuery.creatorName = creator.name;
  }
  // -----------------------------------
  // 3️⃣ FETCH VIDEOS USING QUERY
  // -----------------------------------
  // -----------------------------------
  // 3️⃣ FETCH ALL VIDEOS (HOME / GRID)
  // -----------------------------------
  const videos = await Videos.find(videoQuery, { password: 0 }).lean();

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

      premium: creator.premium ?? false,
      pay: creator.pay ?? false,
      creatorTelegramId: creator.telegramId ?? null,

      price: Number(video.price) || 0,
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
    };
  });
  return Response.json(mergedVideos);
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
      fullKey,
    } = await request.json();

    const creator = await Creators.findOne({
      name: new RegExp(`^${creatorName.trim()}$`, "i"),
    });

    if (!creator) {
      return Response.json({ error: "Creator not found" }, { status: 400 });
    }

    const video = await Videos.create({
      title,
      description,
      thumbnail: normalizePath(thumbnail),
      price: Number(price),
      creatorName: creator.name,
      socialMediaUrl: creator.url,
      url: normalizePath(url),
      fullKey: normalizeFullKey(fullKey),
      tags,
      pay: creator.pay || false,
      premium: creator.premium || false,
    });

    await sendTelegramMessage({
      ...video.toObject(),
      creatorUrlHandle: creator.urlHandle,
    });

    return Response.json(video, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating video:", err);
    return Response.json({ error: "Failed to create video" }, { status: 500 });
  }
}
