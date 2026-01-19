import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  _id,
  telegramId: String, // PRIMARY IDENTITY
  telegramUsername: String,
  firstName: String,
  photoUrl: String,
  role: "owner" | "creator" | "staff",
  creatorId: ObjectId | null, // link to Creators later
  createdAt,
  lastLogin,
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
