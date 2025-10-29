import mongoose from "mongoose";

const VideoViewssSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  viewedAt: { type: Date, default: Date.now },
  sessionId: { type: String }, // optional, to prevent duplicates per session
});

// Avoid recompiling model
export default mongoose.models.VideoViewss ||
  mongoose.model("VideoViewss", VideoViewssSchema);
