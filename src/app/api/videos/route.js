import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js";
import { sendTelegramMessage } from "../../../lib/telegram.js";
const CDN = process.env.CDN_URL || "";

function withCDN(path) {
  if (!path || !CDN) return path;

  // already absolute (signed URLs, etc)
  if (path.startsWith("http")) return path;

  return `${CDN}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);

    const videoId = searchParams.get("id");
    const creatorUrlHandle = searchParams.get("creator");

    // -----------------------------------
    // 1️⃣ FETCH SINGLE VIDEO BY ID
    // -----------------------------------
    if (videoId) {
      const video = await Videos.findById(videoId, { password: 0 });

      if (!video) {
        return Response.json({ error: "Video not found" }, { status: 404 });
      }

      const creator = await Creators.findOne(
        { name: new RegExp(`^${video.creatorName}$`, "i") },
        "name urlHandle premium icon socialMediaUrl type pay telegramId photo"
      );

      // Build enriched single-video response
      const creatorPhoto = creator?.photo ? withCDN(creator.photo) : null;
      const v = video.toObject();

      return Response.json({
        ...v,

        // ✅ APPLY CDN HERE
        url: withCDN(v.url),
        thumbnail: withCDN(v.thumbnail),

        // Canonical creator fields
        creatorName: creator?.name || v.creatorName,
        creatorUrlHandle: creator?.urlHandle || null,
        creatorPhoto,
        premium: creator?.premium || false,
        icon: creator?.icon || null,
        socialMediaUrl: creator?.socialMediaUrl || v.socialMediaUrl,

        // Payments features
        pay: creator?.pay || false,
        creatorTelegramId: creator?.telegramId || null,
      });
    }

    // -----------------------------------
    // 2️⃣ FETCH CREATOR FEED OR ALL
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

    // Fetch videos
    const videos = await Videos.find(filter, { fullKey: 0, password: 0 }).sort({
      createdAt: -1,
    });

    // Fetch creators for metadata injection
    const creators = await Creators.find(
      {},
      "name urlHandle premium icon socialMediaUrl type pay telegramId photo"
    );

    // -----------------------------------
    // 3️⃣ ENRICH EACH VIDEO WITH CREATOR DATA
    // -----------------------------------
    const enrichedVideos = videos.map((video) => {
      const v = video.toObject();

      const creator = creators.find(
        (c) => c.name.toLowerCase() === v.creatorName.toLowerCase()
      );

      const creatorPhoto = creator?.photo ? withCDN(creator.photo) : null;

      // Build canonical, enriched object
      return {
        ...v,

        // Canonical creator metadata
        creatorName: creator?.name || v.creatorName,
        creatorUrlHandle: creator?.urlHandle || null,
        creatorPhoto,
        premium: creator?.premium || false,
        icon: creator?.icon || null,
        socialMediaUrl: creator?.socialMediaUrl || v.socialMediaUrl || null,

        // Payments branch metadata
        pay: creator?.pay || false,
        creatorTelegramId: creator?.telegramId || null,

        // Apply CDN to video URLs
        url: withCDN(v.url),
        thumbnail: withCDN(v.thumbnail),
      };
    });

    return Response.json(enrichedVideos);
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

    const socialMediaUrl = creator.socialMediaUrl;

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
