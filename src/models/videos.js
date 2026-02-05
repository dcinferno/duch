import mongoose from "mongoose";

const VideosSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String },
    price: { type: Number, required: true, min: 0 },
    creatorName: { type: String, required: true, trim: true, index: true },
    socialMediaUrl: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    password: { type: String, sparse: true },
    type: { type: String, enum: ["video", "image"], default: "video" },
    locked: { type: Boolean, default: false, sparse: true },
    fullKey: { type: String, unique: true, trim: true },
    testMode: { type: Boolean, default: false },
    duration: { type: Number, default: null },
    width: {
      type: Number,
      default: null,
    },

    height: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.models.Videos || mongoose.model("Videos", VideosSchema);
