import mongoose from "mongoose";

const VideoCountSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  totalViews: { type: Number, required: true, default: 0 },
  viewedAt: { type: Date, default: Date.now },
});

// Avoid recompiling model
export default mongoose.models.VideoViews ||
  mongoose.model("VideoViews", VideoCountSchema);
