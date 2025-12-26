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

function applyDiscount({ basePrice, discounts = [] }) {
  let best = null;

  for (const d of discounts) {
    if (!d || !d.type) continue;

    // ---- percentage vs percentage
    if (d.type === "percentage" && Number.isFinite(d.percentOff)) {
      if (
        !best ||
        (best.type === "percentage" && d.percentOff > best.percentOff)
      ) {
        best = d;
      }
      continue;
    }

    // ---- fixed vs fixed
    if (d.type === "fixed" && Number.isFinite(d.amount)) {
      if (!best || (best.type === "fixed" && d.amount < best.amount)) {
        best = d;
      }
    }
  }

  let finalPrice = basePrice;

  if (best) {
    if (best.type === "percentage") {
      finalPrice = Math.round(basePrice * (1 - best.percentOff / 100));
    }

    if (best.type === "fixed") {
      finalPrice = best.amount;
    }
  }

  return {
    basePrice,
    finalPrice,
    appliedDiscount: best,
  };
}

/* ------------------------------------------
   FETCH ACTIVE DISCOUNTS (PROCESS SERVER)
------------------------------------------- */
async function fetchActiveDiscounts() {
  const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/discount/active`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
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

    if (!video) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    const creatorKey = video.creatorName?.trim().toLowerCase();
    const creator = creatorMap[creatorKey] || {};
    const pricing = applyDiscount(video, safeDiscounts);

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
      discount: pricing.discount
        ? {
            label: pricing.discount.name,
            percentOff: pricing.discount.percentOff,
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
    const creatorKey = video.creatorName?.trim().toLowerCase();
    const creator = creatorMap[creatorKey] || {};
    const pricing = applyDiscount(video, safeDiscounts);

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
      discount: pricing.discount
        ? {
            label: pricing.discount.name,
            percentOff: pricing.discount.percentOff,
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
