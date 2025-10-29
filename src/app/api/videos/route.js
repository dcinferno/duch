import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js";

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const creatorUrlHandle = searchParams.get("creator"); // e.g. ?creator=johnsmith

    let filter = {};

    // 1️⃣ Check if a specific creator page is being requested
    if (creatorUrlHandle) {
      // Allow secret creators when their page is requested
      const creator = await Creators.findOne({
        urlHandle: new RegExp(`^${creatorUrlHandle}$`, "i"),
      });

      if (!creator) {
        return Response.json({ error: "Creator not found" }, { status: 404 });
      }

      filter.creatorName = new RegExp(`^${creator.name}$`, "i");

      // Get videos only for this creator
      const videos = await Videos.find(filter).sort({ createdAt: -1 });

      // Merge their own data
      const videosWithCreatorData = videos.map((video) => ({
        ...video.toObject(),
        creatorUrlHandle: creator.urlHandle,
        premium: creator.premium,
        icon: creator.icon,
        socialMediaUrl: creator.socialMediaUrl || video.socialMediaUrl,
      }));

      return Response.json(videosWithCreatorData);
    }

    // 2️⃣ If no creator specified → public feed (exclude secret creators)
    const visibleCreators = await Creators.find(
      { secret: { $ne: true } },
      "name urlHandle premium icon socialMediaUrl"
    );

    // Extract visible names
    const visibleCreatorNames = visibleCreators.map((c) => c.name);

    // Find videos from visible creators only
    const videos = await Videos.find({
      creatorName: { $in: visibleCreatorNames },
    }).sort({ createdAt: -1 });

    // Merge creator info
    const videosWithCreatorData = videos.map((video) => {
      const creator = visibleCreators.find(
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
