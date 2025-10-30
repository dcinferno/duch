import mongoose from "mongoose";

const VideosSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String },
    price: { type: Number, required: true, min: 0 },
    creatorName: { type: String, required: true, trim: true },
    socialMediaUrl: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Videos || mongoose.model("Videos", VideosSchema);
