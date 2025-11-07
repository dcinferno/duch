import { Telegraf, session } from "telegraf";
import { connectToDB } from "../lib/mongodb.js";
import Creators from "../models/creators.js";
import Videos from "../models/videos.js";
import { sendTelegramMessage } from "./telegram.js";

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// ✅ Helper: Upload file (video or thumbnail) to your /api/upload route
async function uploadToS3(fileUrl, fileName, folder = "videos") {
  const res = await fetch(fileUrl);
  const buffer = await res.arrayBuffer();
  const contentType = fileUrl.endsWith(".jpg") ? "image/jpeg" : "video/mp4";

  // Ask your /api/upload endpoint for a signed URL
  const signRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.UPLOAD_SECRET_KEY,
      fileName,
      contentType,
      folder,
    }),
  });

  const { uploadUrl, publicUrl } = await signRes.json();
  if (!uploadUrl) throw new Error("Failed to get upload URL from server");

  // Upload binary file directly to S3
  await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buffer,
  });

  return publicUrl;
}

// 🧩 Step 1: Start upload
bot.command("upload", async (ctx) => {
  ctx.session = { step: "title" };
  await ctx.reply("🎬 Please send the video title:");
});

// 🧩 Step 2: Collect metadata
bot.hears(/.*/, async (ctx) => {
  if (!ctx.session) ctx.session = {};

  switch (ctx.session.step) {
    case "title":
      ctx.session.title = ctx.message.text;
      ctx.session.step = "description";
      return ctx.reply("📝 Send the video description:");

    case "description":
      ctx.session.description = ctx.message.text;
      ctx.session.step = "price";
      return ctx.reply("💰 What’s the price? (0 for free)");

    case "price":
      ctx.session.price = parseFloat(ctx.message.text) || 0;
      ctx.session.step = "video";
      return ctx.reply("📹 Send the video file now.");

    default:
      return ctx.reply("Use /upload to start a new video upload.");
  }
});

// 🧩 Step 3: Handle video
bot.on("video", async (ctx) => {
  if (ctx.session?.step !== "video") return;

  try {
    await connectToDB();

    const telegramId = ctx.message.from.id;
    const creator =
      (await Creators.findOne({ telegramId })) ||
      (await Creators.findOne({ username: ctx.message.from.username }));

    if (!creator) {
      return ctx.reply("❌ You are not authorized to upload videos.");
    }

    const fileId = ctx.message.video.file_id;
    const file = await ctx.telegram.getFile(fileId);
    const telegramVideoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

    // ✅ Thumbnail (optional)
    let thumbnailUrl = null;
    if (ctx.message.video.thumbnail?.file_id) {
      const thumbFile = await ctx.telegram.getFile(
        ctx.message.video.thumbnail.file_id
      );
      const telegramThumbUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${thumbFile.file_path}`;

      thumbnailUrl = await uploadToS3(
        telegramThumbUrl,
        "thumbnail.jpg",
        "thumbnails"
      );
    }

    // ✅ Upload video to S3
    const s3VideoUrl = await uploadToS3(
      telegramVideoUrl,
      "video.mp4",
      "videos"
    );

    const { title, description, price } = ctx.session;

    // ✅ Save to DB
    const video = await Videos.create({
      title,
      description,
      thumbnail: thumbnailUrl,
      price,
      creatorName: creator.name,
      socialMediaUrl: creator.socialMediaUrl,
      url: s3VideoUrl,
    });

    // ✅ Post to Telegram channel
    await sendTelegramMessage(video);

    await ctx.reply("✅ Video uploaded successfully and published!");
    ctx.session = null;
  } catch (err) {
    console.error("Upload error:", err);
    ctx.reply("❌ Failed to upload video. Please try again later.");
  }
});

export default bot;
