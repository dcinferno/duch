import mongoose from "mongoose";

const SearchTermSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
    },

    count: {
      type: Number,
      default: 1,
    },

    // Last time this term was searched
    lastSearchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Optional insights
    zeroResultCount: {
      type: Number,
      default: 0,
    },

    // Helpful for product analysis later
    sources: {
      type: Map,
      of: Number, // { VideoGridClient: 12, CreatorPage: 4 }
      default: {},
    },

    // Optional snapshot (NOT indexed)
    lastContext: {
      resultsCount: Number,
      filters: {
        premium: Boolean,
        paid: Boolean,
        discounted: Boolean,
        tags: [String],
      },
    },
  },
  { timestamps: true }
);

// Prevent duplicate terms
SearchTermSchema.index({ term: 1 }, { unique: true });

export default mongoose.models.SearchTerm ||
  mongoose.model("SearchTerm", SearchTermSchema);
