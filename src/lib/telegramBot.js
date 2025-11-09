import { Telegraf } from "telegraf";
import { uploadToS3 } from "@/lib/pushrS3.js";
import { sendTelegramMessage } from "@/lib/telegram.js";
import Creators from "@/models/creators.js";
import Videos from "@/models/videos.js";
import { connectToDB } from "@/lib/mongodb.js";

// --- Initialize Bot ---
export const bot = new Telegraf(process.env.BOT_TOKEN);

// --- State storage (simple in-memory per user) ---
const userStates = new Map();

// --- Helper: prompt user for next step ---
async function askStep(ctx, step, question) {
  userStates.set(ctx.from.id, {
    step,
    data: userStates.get(ctx.from.id)?.data || {},
  });
  await ctx.reply(question);
}

// --- /upload command ---
bot.command("upload", async (ctx) => {
  await connectToDB();
  const uploader = await Creators.findOne({ telegramId: ctx.from.id });
  if (!uploader) return ctx.reply("❌ You are not registered as a creator.");

  await askStep(ctx, "title", "📌 Please enter the video title:");
});

// --- Message handler for upload flow ---
bot.on("message", async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (!state) return; // no active session

  const { step, data } = state;
  const text = ctx.message.text;

  try {
    switch (step) {
      // 1️⃣ Title
      case "title":
        data.title = text;
        await askStep(ctx, "description", "📝 Enter video description:");
        break;

      // 2️⃣ Description
      case "description":
        data.description = text;
        await askStep(ctx, "price", "💰 Enter video price (0 for free):");
        break;

      // 3️⃣ Price
      case "price": {
        // Remove $, commas, "USD", etc.
        const clean = text.replace(/[^0-9.]/g, "");
        data.price = parseFloat(clean) || 0;
        await askStep(ctx, "video", "🎥 Please send the video file now:");
        break;
      }

      // 4️⃣ Video upload
      case "video":
        if (!ctx.message.video) {
          return ctx.reply("❌ Please send a video file.");
        }

        const telegramVideo = ctx.message.video;

        // --- Download the video from Telegram ---
        const fileRes = await fetch(
          `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${telegramVideo.file_id}`
        );
        if (!fileRes.ok) throw new Error(`getFile failed: ${fileRes.status}`);
        const fileData = await fileRes.json();
        const filePath = fileData.result.file_path;
        const telegramVideoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;

        // Download file bytes
        const downloadRes = await fetch(telegramVideoUrl);
        if (!downloadRes.ok)
          throw new Error(`Failed to download video: ${downloadRes.status}`);
        const videoArrayBuf = await downloadRes.arrayBuffer();
        const videoBuffer = Buffer.from(videoArrayBuf);

        // Detect extension & content type
        let videoExt = ".mp4";
        if (filePath && filePath.includes(".")) {
          videoExt = filePath
            .substring(filePath.lastIndexOf("."))
            .toLowerCase();
        } else if (
          telegramVideo.file_name &&
          telegramVideo.file_name.includes(".")
        ) {
          videoExt = telegramVideo.file_name
            .substring(telegramVideo.file_name.lastIndexOf("."))
            .toLowerCase();
        }
        const videoFileName =
          telegramVideo.file_name || `video_${Date.now()}${videoExt}`;
        const videoContentType =
          downloadRes.headers.get("content-type") || "video/mp4";

        // Upload to S3
        const s3VideoUrl = await uploadToS3(
          videoBuffer,
          `videos/${videoFileName}`,
          videoContentType
        );

        // --- Upload thumbnail if exists ---
        let s3ThumbnailUrl = null;
        if (telegramVideo.thumb) {
          const thumbFileRes = await fetch(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${telegramVideo.thumb.file_id}`
          );
          if (!thumbFileRes.ok)
            throw new Error(`getFile(thumb) failed: ${thumbFileRes.status}`);
          const thumbData = await thumbFileRes.json();
          const thumbPath = thumbData.result.file_path;
          const thumbUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${thumbPath}`;

          const thumbDownload = await fetch(thumbUrl);
          if (!thumbDownload.ok)
            throw new Error(
              `Failed to download thumbnail: ${thumbDownload.status}`
            );
          const thumbArrayBuf = await thumbDownload.arrayBuffer();
          const thumbBuffer = Buffer.from(thumbArrayBuf);

          const thumbExt = thumbPath.includes(".")
            ? thumbPath.substring(thumbPath.lastIndexOf(".")).toLowerCase()
            : ".jpg";
          const thumbFileName = `thumb_${Date.now()}${thumbExt}`;
          const thumbContentType =
            thumbDownload.headers.get("content-type") || "image/jpeg";

          s3ThumbnailUrl = await uploadToS3(
            thumbBuffer,
            `thumbnails/${thumbFileName}`,
            thumbContentType
          );
        }

        // --- Save to database ---
        await connectToDB();
        const creator = await Creators.findOne({ telegramId: ctx.from.id });
        if (!creator)
          return ctx.reply(
            "❌ Creator not found in database. Contact support."
          );

        const video = await Videos.create({
          title: data.title,
          description: data.description,
          price: data.price,
          creatorName: creator.name,
          socialMediaUrl: creator.socialMediaUrl,
          url: s3VideoUrl,
          thumbnail: s3ThumbnailUrl,
        });

        // --- Notify Telegram channel ---
        await sendTelegramMessage(video);

        ctx.reply("✅ Video uploaded successfully!");
        userStates.delete(ctx.from.id);
        break;

      default:
        ctx.reply("❌ Unknown step.");
        break;
    }
  } catch (err) {
    console.error("❌ Upload flow error:", err);
    ctx.reply("⚠️ Something went wrong. Please try again later.");
    userStates.delete(ctx.from.id);
  }
});
