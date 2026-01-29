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
  const legacy = req.headers.get("x-internal-secret");

  const authHeader = req.headers.get("authorization");

  let bearer = null;
  if (authHeader?.startsWith("Bearer ")) {
    bearer = authHeader.slice(7).trim();
  }

  const token = bearer || legacy;
  const expected = process.env.INTERNAL_API_TOKEN;

  if (!expected) {
    console.error("❌ INTERNAL_API_TOKEN not set in environment");
    return false;
  }

  if (!token) {
    console.error("❌ No internal auth token provided");
    return false;
  }

  if (token !== expected) {
    console.error("❌ Invalid internal auth token");
    return false;
  }

  if (token === expected) {
    return true;
  }

  console.warn("❌ Internal auth failed", {
    hasLegacy: Boolean(legacy),
    hasAuthHeader: Boolean(authHeader),
    legacyValue: legacy,
    bearerValue: bearer,
  });

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

    if (!title || !creatorName || !url || !thumbnail) {
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    //create telegram message
    // fire-and-forget telegram notify
    fetch(`${baseUrl}/api/telegram/${video._id}`).catch((err) => {
      console.error("⚠️ Telegram notify failed:", err);
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

/* ---------------------------------
   PATCH — Internal update
--------------------------------- */
export async function PATCH(req) {
  try {
    // 🔐 Internal auth only
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "Unauthorized (internal only)" },
        { status: 401 },
      );
    }

    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing video id" },
        { status: 400 },
      );
    }

    await connectToDB();

    // Normalize paths if provided
    if (updates.thumbnail) {
      updates.thumbnail = normalizePath(updates.thumbnail);
    }
    if (updates.url) {
      updates.url = normalizePath(updates.url);
    }
    if (updates.fullKey) {
      updates.fullKey = normalizeFullKey(updates.fullKey);
    }

    const video = await Videos.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 },
      );
    }

    console.log("INTERNAL VIDEO UPDATE:", {
      id,
      updates: Object.keys(updates),
      ip: req.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      ok: true,
      video,
    });
  } catch (err) {
    console.error("INTERNAL VIDEO UPDATE ERROR:", err);

    return NextResponse.json(
      { error: err.message || "Internal update failed" },
      { status: 500 },
    );
  }
}
