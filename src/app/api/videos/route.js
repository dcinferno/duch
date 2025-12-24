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

/* ------------------------------------------
   GET — LIST VIDEOS + PRICING
------------------------------------------- */

/* ------------------------------------------
   HELPERS
------------------------------------------- */
const normalize = (s) => s?.trim().toLowerCase();

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
   APPLY DISCOUNT TO VIDEO
------------------------------------------- */
function applyDiscount(video, discounts) {
  const basePrice = Number(video.price) || 0;

  if (basePrice <= 0) {
    return { basePrice, finalPrice: basePrice, discount: null };
  }

  const creatorKey = normalize(video.creatorName);

  const discount =
    discounts?.creators?.[creatorKey] || discounts?.global || null;

  if (!discount || !discount.type) {
    return { basePrice, finalPrice: basePrice, discount: null };
  }

  let finalPrice = basePrice;

  if (discount.type === "percentage") {
    if (typeof discount.percentOff !== "number") {
      return { basePrice, finalPrice: basePrice, discount: null };
    } else {
      finalPrice = basePrice * (1 - discount.percentOff / 100);
    }
  }

  if (discount.type === "fixed") {
    if (typeof discount.value !== "number") {
      return { basePrice, finalPrice: basePrice, discount: null };
    } else {
      finalPrice = discount.value;
    }
  }

  // Safety clamp
  if (finalPrice < 0) finalPrice = 0;

  return {
    basePrice,
    finalPrice: Number(finalPrice.toFixed(2)),
    discount,
  };
}

/* ------------------------------------------
   GET /api/videos
------------------------------------------- */
export async function GET() {
  await connectToDB();

  // 1️⃣ Fetch videos
  const videos = await Videos.find({}, { password: 0 }).lean();
  const creators = await Creators.find(
    {},
    { name: 1, premium: 1, pay: 1 }
  ).lean();
  const creatorMap = Object.fromEntries(
    creators.map((c) => [
      c.name?.trim().toLowerCase(),
      {
        premium: Boolean(c.premium),
        pay: Boolean(c.pay),
      },
    ])
  );

  const mergedVideos = videos.map((video) => {
    const key = video.creatorName?.trim().toLowerCase();
    const creator = creatorMap[key] || {};

    return {
      ...video,

      // 🔗 reattach creator-level flags
      premium: creator.premium ?? false,
      pay: creator.pay ?? false,

      // normalize pricing fields while we're here
      price: Number(video.price) || 0,
    };
  });

  // 2️⃣ Fetch discounts ONCE
  const discounts = await fetchActiveDiscounts();

  // 3️⃣ Apply pricing per video
  const pricedVideos = mergedVideos.map((video) => {
    const pricing = applyDiscount(video, discounts);

    return {
      ...video,
      thumbnail: withCDN(video.thumbnail),
      url: withCDN(video.url),
      basePrice: pricing.basePrice,
      finalPrice: pricing.finalPrice,
      discount: pricing.discount,
      badge: pricing.discount?.badge ?? null,
    };
  });

  return Response.json({ videos: pricedVideos });
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
