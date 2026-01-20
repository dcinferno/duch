export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongodb";
import Videos from "@/models/videos";
import Creators from "@/models/creators";
import { sendTelegramMessage } from "@/lib/telegram.js";

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
/* ---------------------------------
   Internal Auth (shared)
--------------------------------- */
function isAuthorized(req) {
  // Support both old and new header styles (safe migration)
  const legacy = req.headers.get("x-internal-secret");
  const auth = req.headers.get("authorization");

  if (legacy && legacy === process.env.INTERNAL_API_TOKEN) return true;

  if (auth && auth === `Bearer ${process.env.INTERNAL_API_TOKEN}`) {
    return true;
  }

  return false;
}

/* ---------------------------------
   GET — Internal listing
--------------------------------- */
export async function GET(req) {
  // 🔐 Internal auth
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const creatorName = searchParams.get("creatorName");

  await connectToDB();

  let filter = {};

  // Creator scoped query
  if (creatorName) {
    filter.creatorName = creatorName;
  }

  const videos = await Videos.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({ videos });
}

/* ---------------------------------
   POST — Internal create (VPS uploads)
--------------------------------- */
export async function POST(req) {
  try {
    // 🔐 Internal auth only
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "Unauthorized (internal only)" },
        { status: 401 },
      );
    }

    // ---------------------------
    // Parse payload from VPS
    // ---------------------------
    const {
      title,
      description,
      thumbnail,
      url,
      fullKey,
      creatorName,
      tags,
      price,
      duration,
      width,
      height,
    } = await req.json();

    console.log("INTERNAL VIDEO CREATE:", {
      creatorName,
      title,
      ip: req.headers.get("x-forwarded-for"),
    });

    if (!title || !creatorName || !url || !previewUrl || !thumbnail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await connectToDB();

    // ---------------------------
    // Validate creator
    // ---------------------------
    const creator = await Creators.findOne({ name: creatorName }).lean();

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 400 });
    }

    // ---------------------------
    // Create video (mirror /api/videos logic)
    // ---------------------------
    const video = await Videos.create({
      title,
      description,
      thumbnail: normalizePath(thumbnail),
      price: Number(price) || 0,
      creatorName: creator.name,
      url: normalizePath(url),
      socialMediaUrl: creator.url,
      fullKey: normalizeFullKey(fullKey),
      tags: Array.isArray(tags) ? tags : [],
      pay: creator.pay || false,
      premium: creator.premium || false,
      duration,
      width,
      height,
    });

    await sendTelegramMessage({
      ...video.toObject(),
      creatorUrlHandle: creator.urlHandle,
    });
    // 🔥 Future: telegram hooks, analytics, etc go HERE
    // This becomes your ingestion pipeline

    return NextResponse.json({
      ok: true,
      video,
    });
  } catch (err) {
    console.error("INTERNAL VIDEO CREATE ERROR:", err);

    return NextResponse.json(
      { error: err.message || "Internal upload failed" },
      { status: 500 },
    );
  }
}
