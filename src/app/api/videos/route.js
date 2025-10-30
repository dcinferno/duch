import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js";

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const creatorUrlHandle = searchParams.get("creator"); // ?creator=johnsmith

    let filter = {};

    if (creatorUrlHandle) {
      // Fetch the specific creator
      const creator = await Creators.findOne({
        urlHandle: new RegExp(`^${creatorUrlHandle}$`, "i"),
      });

      if (!creator) {
        return Response.json({ error: "Creator not found" }, { status: 404 });
      }

      // Case-insensitive match for videos by creator name
      filter.creatorName = new RegExp(`^${creator.name}$`, "i");
    } else {
      // If fetching ALL videos, exclude secret creators
      const publicCreators = await Creators.find(
        { secret: { $ne: true } },
        "name"
      );
      const publicCreatorNames = publicCreators.map((c) => c.name);
      filter.creatorName = { $in: publicCreatorNames };
    }

    // Fetch videos
    const videos = await Videos.find(filter).sort({ createdAt: -1 });

    // Fetch all creators to merge their data
    const creators = await Creators.find(
      {},
      "name urlHandle premium icon socialMediaUrl"
    );

    // Merge creator info into each video
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
    const { title, description, thumbnail, price, creatorName, url, tags } =
      await request.json();

    // Normalize creator name
    const normalizedName = creatorName.trim();

    // Find creator
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
      creatorName: creator.name,
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
