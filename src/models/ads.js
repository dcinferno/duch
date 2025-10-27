import mongoose from "mongoose";

// lib/models/Ads.js

const AdSchema = new mongoose.Schema({
  title: String,
  url: { type: String, unique: true },
  creatorName: { type: String, required: true },
});

export default mongoose.models.Ads || mongoose.model("Ads", AdSchema);
