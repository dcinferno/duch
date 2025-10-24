import mongoose from "mongoose";

const SiteSettingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g., "age_verification", "announcement_banner"
    title: { type: String }, // optional title for the setting
    message: { type: String }, // main content/message
    yesText: { type: String }, // optional, e.g., for buttons
    noText: { type: String },
    redirectUrl: { type: String }, // <-- new field// optional, e.g., for buttons
    extra: { type: mongoose.Schema.Types.Mixed }, // optional JSON for extra custom data
  },
  { timestamps: true }
);

export default mongoose.models.SiteSetting ||
  mongoose.model("SiteSetting", SiteSettingSchema);
