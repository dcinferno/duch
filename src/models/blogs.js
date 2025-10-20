import mongoose from "mongoose";

// lib/models/Blog.js

const BlogSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  content: String,
  publishedAt: { type: Date, default: Date.now },
  author: String,
  tags: [String],
  imageUrl: { type: String, required: false }, // <-- Optional image URL
});

export default mongoose.models.Blog || mongoose.model("Blog", BlogSchema);
