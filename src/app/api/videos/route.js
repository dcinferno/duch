import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js";
import { sendTelegramMessage } from "../../../lib/telegram.js";

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("id");
    const creatorUrlHandle = searchParams.get("creator");

    // -----------------------------------
    // ✅ 1️⃣ Fetch single video by ID
    // -----------------------------------
    if (videoId) {
      const video = await Videos.findById(videoId, { password: 0 });

      if (!video) {
        return Response.json({ error: "Video not found" }, { status: 404 });
      }

      const creator = await Creators.findOne(
        { name: new RegExp(`^${video.creatorName}$`, "i") },
        "name urlHandle premium icon socialMediaUrl type pay"
      );

      return Response.json({
        ...video.toObject(),
        creatorUrlHandle: creator?.urlHandle || null,
        premium: creator?.premium || false,
        icon: creator?.icon || null,
        socialMediaUrl: creator?.socialMediaUrl || video.socialMediaUrl,
        pay: creator?.pay || false,
      });
    }

    // -----------------------------------
    // ✅ 2️⃣ Creator feed OR all public videos
    // -----------------------------------
    let filter = {};

    if (creatorUrlHandle) {
      const creator = await Creators.findOne({
        urlHandle: new RegExp(`^${creatorUrlHandle}$`, "i"),
      });

      if (!creator) {
        return Response.json({ error: "Creator not found" }, { status: 404 });
      }

      filter.creatorName = new RegExp(`^${creator.name}$`, "i");
    } else {
      const publicCreators = await Creators.find(
        { secret: { $ne: true } },
        "name"
      );
      filter.creatorName = { $in: publicCreators.map((c) => c.name) };
    }

    const videos = await Videos.find(filter, { fullKey: 0, password: 0 }).sort({
      createdAt: -1,
    });

    const creators = await Creators.find(
      {},
      "name urlHandle premium icon socialMediaUrl type pay"
    );

    const videosWithCreatorData = videos.map((video) => {
      const creator = creators.find(
        (c) => c.name.toLowerCase() === video.creatorName.toLowerCase()
      );

      return {
        ...video.toObject(),
        creatorUrlHandle: creator?.urlHandle || null,
        premium: creator?.premium || false,
        icon: creator?.icon || null,
        socialMediaUrl: creator?.url || video.socialMediaUrl,
        pay: creator?.pay || false,
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

    const normalizedName = creatorName.trim();
    const creator = await Creators.findOne({
      name: new RegExp(`^${normalizedName}$`, "i"),
    });

    if (!creator) {
      return Response.json({ error: "Creator not found" }, { status: 400 });
    }

    const socialMediaUrl = creator.url || creator.socialMediaUrl;

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

    await sendTelegramMessage(video);

    return Response.json(video, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating video:", err);
    return Response.json({ error: "Failed to create video" }, { status: 500 });
  }
}
