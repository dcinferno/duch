import { connectToDB } from "../../../lib/mongodb.js";
import Videos from "../../../models/videos.js";
import Creators from "../../../models/creators.js";
import { sendTelegramMessage } from "../../../lib/telegram.js";

export async function GET(request) {
  try {
    await connectToDB();

    const CDN = process.env.CDN_URL || "";
    const { searchParams } = new URL(request.url);
    const creatorUrlHandle = searchParams.get("creator");

    let filter = {};

    if (creatorUrlHandle) {
      const creator = await Creators.findOne({
        urlHandle: new RegExp(`^${creatorUrlHandle}$`, "i"),
      });

      if (!creator) {
        return Response.json({ error: "Creator not found" }, { status: 404 });
      }

      // Query videos using canonical creator name
      filter.creatorName = new RegExp(`^${creator.name}$`, "i");
    } else {
      const publicCreators = await Creators.find(
        { secret: { $ne: true } },
        "name"
      );

      const allowedNames = publicCreators.map((c) => c.name);
      filter.creatorName = { $in: allowedNames };
    }

    const videos = await Videos.find(filter, { password: 0 }).sort({
      createdAt: -1,
    });

    const creators = await Creators.find(
      {},
      "name urlHandle premium icon socialMediaUrl type photo"
    );

    const enrichedVideos = videos.map((video) => {
      const v = video.toObject();

      const creator = creators.find(
        (c) => c.name.toLowerCase() === v.creatorName.toLowerCase()
      );

      if (creator) {
        v.creatorName = creator.name; // canonical
        v.creatorUrlHandle = creator.urlHandle;

        // PHOTO
        if (creator.photo) {
          let photo = creator.photo;
          if (!photo.startsWith("/")) photo = "/" + photo;
          v.creatorPhoto = CDN + photo;
        } else {
          v.creatorPhoto = null;
        }

        v.premium = creator.premium || false;
        v.icon = creator.icon || null;
        v.socialMediaUrl = creator.socialMediaUrl || v.socialMediaUrl || null;
      }

      // VIDEO URLS
      if (v.url?.startsWith("/")) v.url = CDN + v.url;
      if (v.thumbnail?.startsWith("/")) v.thumbnail = CDN + v.thumbnail;

      return v;
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

    // 🚀 Post to Telegram channel
    await sendTelegramMessage(video);

    return Response.json(video, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating video:", err);
    return Response.json({ error: "Failed to create video" }, { status: 500 });
  }
}
