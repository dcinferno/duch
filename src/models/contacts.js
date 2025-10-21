// models/Contact.js
import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  url: { type: String, required: true },
  color: { type: String }, // optional tailwind color class like "text-blue-400"
});

export default mongoose.models.Contact ||
  mongoose.model("Contact", contactSchema);
