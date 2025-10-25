import mongoose from "mongoose";

const CreatorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true }, // social media or personal link
  premium: { type: Boolean, default: false },
  urlHandle: { type: String, unique: true, sparse: true }, // only for premium creators
  photo: { type: String }, // optional profile picture
  icon: { type: String }, // optional sidebar icon image
});

export default mongoose.models.Creators ||
  mongoose.model("Creators", CreatorSchema);
