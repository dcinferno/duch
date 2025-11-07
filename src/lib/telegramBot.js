import { Telegraf } from "telegraf";
import { uploadToS3 } from "@/lib/pushrS3.js";
import { sendTelegramMessage } from "@/lib/telegram.js";
import Creators from "@/models/creators.js";
import Videos from "@/models/videos.js";
import { connectToDB } from "@/lib/mongodb.js";

// --- Bot setup ---
export const bot = new Telegraf(process.env.BOT_TOKEN);

// --- State storage (in-memory) ---
const userStates = new Map();

// --- Helper: ask a step ---
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

// --- Step-by-step message handler ---
bot.on("message", async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (!state) return; // no active flow

  const { step, data } = state;
  const text = ctx.message.text;

  try {
    switch (step) {
      case "title":
        data.title = text;
        await askStep(ctx, "description", "📝 Enter video description:");
        break;

      case "description":
        data.description = text;
        await askStep(ctx, "price", "💰 Enter video price (0 for free):");
        break;

      case "price":
        data.price = parseFloat(text) || 0;
        await askStep(ctx, "video", "🎥 Please send the video file now:");
        break;

      case "video":
        if (!ctx.message.video)
          return ctx.reply("❌ Please send video. (Upload as video)");

        const telegramVideo = ctx.message.video;

        // --- Get Telegram file URL ---
        const fileRes = await fetch(
          `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${telegramVideo.file_id}`
        );
        const fileData = await fileRes.json();
        const telegramVideoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileData.result.file_path}`;

        // --- Upload video to S3 ---
        const s3VideoUrl = await uploadToS3(
          telegramVideoUrl,
          telegramVideo.file_name || `video_${Date.now()}.mp4`,
          "videos"
        );

        // --- Upload thumbnail if exists ---
        let s3ThumbnailUrl = null;
        if (telegramVideo.thumb) {
          const thumbRes = await fetch(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${telegramVideo.thumb.file_id}`
          );
          const thumbData = await thumbRes.json();
          const thumbUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${thumbData.result.file_path}`;

          s3ThumbnailUrl = await uploadToS3(
            thumbUrl,
            `thumb_${Date.now()}.jpg`,
            "thumbnails"
          );
        }

        // --- Save video record ---
        await connectToDB();
        const creator = await Creators.findOne({ telegramId: ctx.from.id });
        const video = await Videos.create({
          title: data.title,
          description: data.description,
          price: data.price,
          creatorName: creator.name,
          socialMediaUrl: creator.url,
          url: s3VideoUrl,
          thumbnail: s3ThumbnailUrl,
        });

        // --- Send to channel ---
        await sendTelegramMessage(video);

        ctx.reply("✅ Video uploaded successfully!");
        userStates.delete(ctx.from.id); // clear state
        break;

      default:
        ctx.reply("❌ Unknown step.");
        break;
    }
  } catch (err) {
    console.error("❌ Upload failed:", err);
    ctx.reply("❌ Failed to upload video. Check server logs.");
    userStates.delete(ctx.from.id); // clear state on error
  }
});
