import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js";

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const creatorUrlHandle = searchParams.get("creator"); // ?creator=johnsmith

    let filter = {};

    // 🧩 Step 1: Check if a specific creator is being requested
    let creator = null;
    if (creatorUrlHandle) {
      // Allow secret creators when fetching their own page
      creator = await Creators.findOne({
        urlHandle: new RegExp(`^${creatorUrlHandle}$`, "i"),
      });

      if (!creator) {
        return Response.json({ error: "Creator not found" }, { status: 404 });
      }

      // Match videos by creator name
      filter.creatorName = new RegExp(`^${creator.name}$`, "i");
    }

    // 🧩 Step 2: Decide which creators to fetch
    // If no specific creator requested → hide secret ones
    const creatorQuery = creatorUrlHandle
      ? {} // show all when visiting a specific creator page
      : { secret: { $ne: true } };

    const creators = await Creators.find(
      creatorQuery,
      "name urlHandle premium icon socialMediaUrl secret"
    );

    // 🧩 Step 3: For public listing, only include videos from non-secret creators
    if (!creatorUrlHandle) {
      const visibleCreatorNames = creators.map((c) => c.name.toLowerCase());
      filter.creatorName = { $in: visibleCreatorNames };
    }

    // 🧩 Step 4: Fetch videos
    const videos = await Videos.find(filter).sort({ createdAt: -1 });

    // 🧩 Step 5: Merge creator info
    const videosWithCreatorData = videos.map((video) => {
      const creator = creators.find(
        (c) => c.name.toLowerCase() === video.creatorName.toLowerCase()
      );

      return {
        ...video.toObject(),
        creatorUrlHandle: creator?.urlHandle || null,
        premium: creator?.premium || false,
        icon: creator?.icon || null,
        socialMediaUrl: creator?.socialMediaUrl || video.socialMediaUrl,
      };
    });

    return Response.json(videosWithCreatorData);
  } catch (err) {
    console.error("❌ Error in /api/videos:", err);
    return Response.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}

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
      tags = [],
    } = await request.json();

    // Normalize creator name for searching
    const normalizedName = creatorName.trim();

    // Find creator (case-insensitive)
    const creator = await Creators.findOne({
      name: new RegExp(`^${normalizedName}$`, "i"),
    });

    if (!creator) {
      return Response.json({ error: "Creator not found" }, { status: 400 });
    }

    const socialMediaUrl = creator.url || creator.socialMediaUrl;

    // Create video record
    const video = await Videos.create({
      title,
      description,
      thumbnail,
      price,
      creatorName: creator.name, // keep consistent formatting
      socialMediaUrl,
      url,
      tags,
    });

    return Response.json(video, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating video:", err);
    return Response.json({ error: "Failed to create video" }, { status: 500 });
  }
}
