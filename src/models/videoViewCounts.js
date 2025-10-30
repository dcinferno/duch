import mongoose from "mongoose";

const VideoCountSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  totalViews: { type: Number, required: true, default: 0 },
});

// Avoid recompiling model
export default mongoose.models.VideoCount ||
  mongoose.model("VideoViews", VideoCountSchema);
