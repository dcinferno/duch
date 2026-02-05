export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongodb";
import Bundle from "@/models/bundles";
import Video from "@/models/videos";
import Creator from "@/models/creators";

/* ---------------------------------
   Internal Auth
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

  return true;
}

/**
 * GET /api/internal/bundle
 * Fetch all bundles (optionally filtered by ?id= or ?creatorId=)
 */
export async function GET(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const bundleId = searchParams.get("id");
    const creatorId = searchParams.get("creatorId");

    const query = {
      ...(bundleId && { _id: bundleId }),
      ...(creatorId && { creatorId }),
    };

    const bundles = await Bundle.find(query).lean();

    if (!bundles.length) {
      return NextResponse.json(bundleId ? null : [], { status: 200 });
    }

    // Collect unique creatorIds
    const creatorIds = [...new Set(bundles.map((b) => b.creatorId.toString()))];
    const creators = await Creator.find(
      { _id: { $in: creatorIds } },
      { name: 1, telegramId: 1, url: 1 }
    ).lean();
    const creatorMap = Object.fromEntries(creators.map((c) => [c._id.toString(), c]));

    // Fetch videos (titles only)
    const allVideoIds = bundles.flatMap((b) => b.videoIds);
    const videos = await Video.find(
      { _id: { $in: allVideoIds } },
      { title: 1 }
    ).lean();
    const videoMap = Object.fromEntries(videos.map((v) => [v._id.toString(), v]));

    const shaped = bundles.map((b) => {
      const creator = creatorMap[b.creatorId.toString()];
      return {
        _id: b._id,
        name: b.name,
        description: b.description,
        price: b.price,
        active: b.active,
        creatorId: b.creatorId,
        creatorName: creator?.name || "",
        creatorTelegramId: creator?.telegramId || "",
        creatorUrl: creator?.url || "",
        videoIds: b.videoIds,
        videoCount: b.videoIds.length,
        videos: b.videoIds.map((id) => videoMap[id.toString()]).filter(Boolean),
      };
    });

    if (bundleId) {
      return NextResponse.json(shaped[0]);
    }

    return NextResponse.json(shaped);
  } catch (err) {
    console.error("❌ Error fetching bundles:", err);
    return NextResponse.json({ error: "Failed to fetch bundles" }, { status: 500 });
  }
}

/**
 * POST /api/internal/bundle
 * Create a new bundle
 * Body: { name, description, price, creatorId, videoIds }
 */
export async function POST(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDB();

    const { name, description, price, creatorId, videoIds } = await req.json();

    if (!name || price == null || !creatorId || !Array.isArray(videoIds) || !videoIds.length) {
      return NextResponse.json(
        { error: "name, price, creatorId, and a non-empty videoIds array are required" },
        { status: 400 },
      );
    }

    const creator = await Creator.findById(creatorId, { name: 1 }).lean();
    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 400 });
    }

    // Verify all videoIds exist and belong to this creator
    const videos = await Video.find(
      { _id: { $in: videoIds } },
      { _id: 1, creatorName: 1 },
    ).lean();

    const videoMap = Object.fromEntries(videos.map((v) => [v._id.toString(), v]));
    const missingIds = videoIds.filter((id) => !videoMap[id.toString()]);

    if (missingIds.length) {
      return NextResponse.json(
        { error: "Videos not found", missingIds },
        { status: 400 },
      );
    }

    const wrongCreator = videos.filter(
      (v) => v.creatorName?.trim().toLowerCase() !== creator.name?.trim().toLowerCase(),
    );

    if (wrongCreator.length) {
      return NextResponse.json(
        { error: "Some videos do not belong to this creator", videoIds: wrongCreator.map((v) => v._id) },
        { status: 400 },
      );
    }

    const bundle = await Bundle.create({
      name,
      description: description || "",
      price,
      creatorId,
      videoIds,
    });

    return NextResponse.json(bundle, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating bundle:", err);
    return NextResponse.json({ error: "Failed to create bundle" }, { status: 500 });
  }
}

/**
 * PATCH /api/internal/bundle
 * Toggle a bundle's active status
 * Body: { bundleId }
 */
export async function PATCH(req) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDB();

    const { bundleId } = await req.json();

    if (!bundleId) {
      return NextResponse.json({ error: "bundleId is required" }, { status: 400 });
    }

    const bundle = await Bundle.findById(bundleId);

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
    }

    bundle.active = !bundle.active;
    await bundle.save();

    return NextResponse.json({ success: true, active: bundle.active }, { status: 200 });
  } catch (err) {
    console.error("❌ Error toggling bundle:", err);
    return NextResponse.json({ error: "Failed to toggle bundle" }, { status: 500 });
  }
}
