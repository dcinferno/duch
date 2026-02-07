"use client";

/**
 * FilterBar component - displays search and filter controls for the video grid
 *
 * @param {Object} props
 * @param {Object} props.filterState - Current filter state from reducer
 * @param {Function} props.dispatch - Dispatch function for filter actions
 * @param {number} props.videosCount - Number of videos after filtering
 * @param {string[]} props.allTags - All available tags for the tags dropdown
 */
export default function FilterBar({
  filterState,
  dispatch,
  videosCount,
  allTags,
}) {
  const {
    searchQuery,
    selectedTags,
    showPremiumOnly,
    showPaidOnly,
    showDiscountedOnly,
    showPurchasedOnly,
    sortByViews,
    sortByLastViewed,
    sortByPrice,
    sortByDurationShort,
    sortByDurationLong,
    showTagsDropdown,
    showShadowGames,
  } = filterState;

  const togglePremium = () => dispatch({ type: "TOGGLE_PREMIUM" });
  const toggleTag = (tag) => dispatch({ type: "TOGGLE_TAG", payload: tag });
  const clearFilters = () => dispatch({ type: "CLEAR_ALL" });

  const hasActiveFilters =
    selectedTags.length > 0 ||
    showPremiumOnly ||
    showPurchasedOnly ||
    sortByViews ||
    sortByLastViewed ||
    sortByPrice ||
    sortByDurationShort ||
    sortByDurationLong;

  return (
    <>
      {/* MOBILE SEARCH ROW */}
      <div className="w-full mb-4 sm:hidden">
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              dispatch({ type: "SET_SEARCH", payload: e.target.value })
            }
            placeholder="Search…"
            className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-500"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_SEARCH", payload: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-gray-700 transition"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6 justify-center items-center">
        <span className="inline-flex items-center px-3 py-1.5 bg-blue-900/30 text-blue-400 text-sm font-semibold rounded-full shadow-sm">
          {videosCount} {videosCount === 1 ? "item" : "items"}
        </span>

        {/* DESKTOP SEARCH */}
        <div className="relative hidden sm:flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) =>
              dispatch({ type: "SET_SEARCH", payload: e.target.value })
            }
            placeholder="Search…"
            className="px-3 py-1.5 pr-8 rounded-full border border-gray-600 bg-gray-800 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="button"
            onClick={() => dispatch({ type: "SET_SEARCH", payload: "" })}
            className={`absolute right-2 text-gray-400 transition-all ${
              searchQuery
                ? "opacity-100 hover:text-red-500 hover:scale-110"
                : "opacity-0 pointer-events-none"
            }`}
            aria-label="Clear search"
          >
            ✕
          </button>
        </div>

        <button
          onClick={() => dispatch({ type: "TOGGLE_DISCOUNTED" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showDiscountedOnly
              ? "bg-red-600 text-white border-red-600 shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-red-900/30"
          }`}
        >
          🤑 Deals
        </button>

        <button
          onClick={togglePremium}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showPremiumOnly
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-blue-900/30"
          }`}
        >
          💎 Featured Only
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_PAID" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showPaidOnly
              ? "bg-purple-600 text-white border-purple-600 shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-purple-900/30"
          }`}
        >
          💰💵 Paid Only
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_PURCHASED" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showPurchasedOnly
              ? "bg-green-600 text-white border-green-600 shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-green-900/30"
          }`}
        >
          ✅ Purchased
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_SORT_VIEWS" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByViews
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-blue-900/30"
          }`}
        >
          🔥 Most Viewed
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_SORT_LAST_VIEWED" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByLastViewed
              ? "bg-orange-500 text-white border-orange-500 shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-orange-900/30"
          }`}
        >
          👀 Watching Now
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_SHADOW_GAMES" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            showShadowGames
              ? "bg-black text-white border-black shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-gray-700"
          }`}
        >
          😈 Shadow Games
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_SORT_DURATION_SHORT" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByDurationShort
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-blue-900/30"
          }`}
        >
          ⚡ Short
        </button>

        <button
          onClick={() => dispatch({ type: "TOGGLE_SORT_DURATION_LONG" })}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
            sortByDurationLong
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-105"
              : "bg-gray-800 text-gray-200 border-gray-600 hover:bg-blue-900/30"
          }`}
        >
          🎬 Long
        </button>

        {/* TAGS DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => dispatch({ type: "TOGGLE_TAGS_DROPDOWN" })}
            className="px-3 py-1.5 rounded-full border text-sm font-medium bg-gray-800 text-gray-200 border-gray-600 hover:bg-blue-900/30 flex items-center gap-1"
          >
            🏷️ Tags
          </button>

          {showTagsDropdown && (
            <div className="absolute left-0 mt-2 w-56 max-h-64 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-2">
              {allTags.length === 0 ? (
                <p className="text-gray-400 text-sm px-2">No tags</p>
              ) : (
                allTags.map((tag) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-all ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-blue-900/30"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-full border text-sm font-medium bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border-gray-600"
          >
            Clear Filters ✖️
          </button>
        )}
      </div>
    </>
  );
}
