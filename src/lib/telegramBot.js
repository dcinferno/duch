import { Telegraf } from "telegraf";
import { uploadToS3 } from "./pushrS3.js"; // your existing S3 helper
import { sendTelegramMessage } from "./telegram.js"; // your existing function
import Creators from "@/models/creators.js";
import Videos from "@/models/videos.js";
import { connectToDB } from "@/lib/mongodb.js";

export const bot = new Telegraf(process.env.BOT_TOKEN);

bot.on("message", (ctx) => {
  console.log(ctx.from.username, ctx.from.id);
});

// State storage for each user in memory (simple approach)
const userStates = new Map();

// Helper to ask a question and store response
async function askStep(ctx, step, question) {
  userStates.set(ctx.from.id, {
    step,
    data: userStates.get(ctx.from.id)?.data || {},
  });
  await ctx.reply(question);
}

// /upload command
bot.command("upload", async (ctx) => {
  await connectToDB();

  const uploader = await Creators.findOne({ telegramId: ctx.from.id });
  if (!uploader) return ctx.reply("❌ You are not registered as a creator.");

  await askStep(ctx, "title", "📌 Please enter the video title:");
});

// Listen for messages to handle the step-by-step flow
bot.on("message", async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (!state) return; // no ongoing flow

  const { step, data } = state;
  const text = ctx.message.text;

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
      await askStep(
        ctx,
        "video",
        "🎥 Please send the video file now (Telegram video):"
      );
      break;

    case "video":
      if (!ctx.message.video) return ctx.reply("❌ Please send a video file.");

      const telegramVideo = ctx.message.video;
      const fileId = telegramVideo.file_id;

      try {
        // Get download URL from Telegram
        const fileUrlRes = await fetch(
          `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
        );
        const fileData = await fileUrlRes.json();
        const telegramFilePath = fileData.result.file_path;
        const telegramVideoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${telegramFilePath}`;

        // Upload video to S3
        const s3Video = await uploadToS3(
          telegramVideoUrl,
          telegramVideo.file_name || "video.mp4",
          "videos"
        );

        // Use Telegram thumbnail automatically
        let thumbnailUrl = null;
        if (telegramVideo.thumb) {
          const thumbFileId = telegramVideo.thumb.file_id;
          const thumbFileRes = await fetch(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${thumbFileId}`
          );
          const thumbData = await thumbFileRes.json();
          const thumbPath = thumbData.result.file_path;
          const thumbUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${thumbPath}`;
          const s3Thumb = await uploadToS3(
            thumbUrl,
            "thumbnail.jpg",
            "thumbnails"
          );
          thumbnailUrl = s3Thumb;
        }

        // Save video to DB
        await connectToDB();
        const creator = await Creators.findOne({ telegramId: ctx.from.id });
        const video = await Videos.create({
          title: data.title,
          description: data.description,
          price: data.price,
          creatorName: creator.name,
          socialMediaUrl: creator.socialMediaUrl,
          url: s3Video,
          thumbnail: thumbnailUrl,
        });

        // Notify channel
        await sendTelegramMessage(video);

        ctx.reply("✅ Video uploaded successfully!");
      } catch (err) {
        console.error("❌ Upload failed:", err);
        ctx.reply("❌ Failed to upload video. Check logs.");
      }

      // Clear state
      userStates.delete(ctx.from.id);
      break;

    default:
      ctx.reply("❌ Unknown step.");
      break;
  }
});
