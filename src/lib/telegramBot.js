import { Telegraf } from "telegraf";
import { uploadToS3 } from "./s3Upload.js"; // your S3 helper
import { connectToDB } from "./mongodb.js";
import Videos from "./models/videos.js";
import Creators from "./models/creators.js";
import { sendTelegramMessage } from "./telegram.js";

const bot = new Telegraf(process.env.BOT_TOKEN);

const userStates = new Map();

// Start upload
bot.command("upload", async (ctx) => {
  userStates.set(ctx.from.id, { step: "title" });
  await ctx.reply("📝 Enter the title of your video:");
});

// Handle messages
bot.on("message", async (ctx) => {
  const state = userStates.get(ctx.from.id);
  if (!state) return;

  try {
    if (state.step === "title") {
      state.title = ctx.message.text;
      state.step = "description";
      await ctx.reply("✏️ Enter the description:");
    } else if (state.step === "description") {
      state.description = ctx.message.text;
      state.step = "price";
      await ctx.reply("💰 Enter the price (0 for free):");
    } else if (state.step === "price") {
      state.price = parseFloat(ctx.message.text) || 0;
      state.step = "creator";
      await ctx.reply("👤 Enter your creator name (must be registered):");
    } else if (state.step === "creator") {
      // Verify creator exists
      await connectToDB();
      const creator = await Creators.findOne({ name: ctx.message.text });
      if (!creator) {
        await ctx.reply("❌ Creator not found. Enter a valid name:");
        return;
      }
      state.creator = creator;
      state.step = "video";
      await ctx.reply("🎬 Send your video file now:");
    } else if (state.step === "video") {
      const video = ctx.message.video;
      if (!video) {
        await ctx.reply("❌ Please send a video file.");
        return;
      }

      // Telegram thumbnail
      const thumbFileId = video.thumb?.file_id;

      // Upload video to S3
      const fileLink = await ctx.telegram.getFileLink(video.file_id);
      const s3VideoUrl = await uploadToS3(
        fileLink.href,
        video.file_name || "video.mp4",
        "videos"
      );

      // Upload thumbnail to S3 (if exists)
      let s3ThumbUrl = null;
      if (thumbFileId) {
        const thumbLink = await ctx.telegram.getFileLink(thumbFileId);
        s3ThumbUrl = await uploadToS3(
          thumbLink.href,
          "thumb.jpg",
          "thumbnails"
        );
      }

      // Save to DB
      const newVideo = await Videos.create({
        title: state.title,
        description: state.description,
        price: state.price,
        creatorName: state.creator.name,
        socialMediaUrl: state.creator.socialMediaUrl,
        url: s3VideoUrl,
        thumbnail: s3ThumbUrl,
      });

      // Optional: post to channel
      await sendTelegramMessage(newVideo);

      await ctx.reply("✅ Video uploaded successfully!");
      userStates.delete(ctx.from.id);
    }
  } catch (err) {
    console.error(err);
    await ctx.reply("❌ Something went wrong. Try again.");
    userStates.delete(ctx.from.id);
  }
});

export default bot;
