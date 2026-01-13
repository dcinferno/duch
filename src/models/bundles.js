// models/Bundle.js
import mongoose from "mongoose";

const BundleSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    videoIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Videos",
        required: true,
      },
    ],

    price: {
      type: Number,
      required: true, // final bundle price
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { minimize: false }
);

export default mongoose.models.Bundle || mongoose.model("Bundle", BundleSchema);
