import { filterReducer, initialFilterState } from "../src/lib/filterReducer";

describe("filterReducer", () => {
  describe("SET_SEARCH", () => {
    it("sets the search query", () => {
      const result = filterReducer(initialFilterState, {
        type: "SET_SEARCH",
        payload: "funny cats",
      });
      expect(result.searchQuery).toBe("funny cats");
    });

    it("clears the search query", () => {
      const state = { ...initialFilterState, searchQuery: "test" };
      const result = filterReducer(state, { type: "SET_SEARCH", payload: "" });
      expect(result.searchQuery).toBe("");
    });
  });

  describe("TOGGLE_TAG", () => {
    it("adds a tag when not present", () => {
      const result = filterReducer(initialFilterState, {
        type: "TOGGLE_TAG",
        payload: "funny",
      });
      expect(result.selectedTags).toContain("funny");
    });

    it("removes a tag when already present", () => {
      const state = { ...initialFilterState, selectedTags: ["funny", "cats"] };
      const result = filterReducer(state, {
        type: "TOGGLE_TAG",
        payload: "funny",
      });
      expect(result.selectedTags).not.toContain("funny");
      expect(result.selectedTags).toContain("cats");
    });

    it("handles multiple tags", () => {
      let state = initialFilterState;
      state = filterReducer(state, { type: "TOGGLE_TAG", payload: "a" });
      state = filterReducer(state, { type: "TOGGLE_TAG", payload: "b" });
      state = filterReducer(state, { type: "TOGGLE_TAG", payload: "c" });
      expect(state.selectedTags).toEqual(["a", "b", "c"]);
    });
  });

  describe("filter toggles", () => {
    it("toggles premium filter", () => {
      const result = filterReducer(initialFilterState, { type: "TOGGLE_PREMIUM" });
      expect(result.showPremiumOnly).toBe(true);

      const result2 = filterReducer(result, { type: "TOGGLE_PREMIUM" });
      expect(result2.showPremiumOnly).toBe(false);
    });

    it("toggles paid filter", () => {
      const result = filterReducer(initialFilterState, { type: "TOGGLE_PAID" });
      expect(result.showPaidOnly).toBe(true);
    });

    it("toggles discounted filter", () => {
      const result = filterReducer(initialFilterState, { type: "TOGGLE_DISCOUNTED" });
      expect(result.showDiscountedOnly).toBe(true);
    });

    it("toggles purchased filter", () => {
      const result = filterReducer(initialFilterState, { type: "TOGGLE_PURCHASED" });
      expect(result.showPurchasedOnly).toBe(true);
    });
  });

  describe("sort toggles - mutual exclusivity", () => {
    it("enables sortByViews and disables other sorts", () => {
      const state = {
        ...initialFilterState,
        sortByPrice: true,
        sortByDurationShort: true,
      };
      const result = filterReducer(state, { type: "TOGGLE_SORT_VIEWS" });

      expect(result.sortByViews).toBe(true);
      expect(result.sortByPrice).toBe(false);
      expect(result.sortByDurationShort).toBe(false);
      expect(result.sortByDurationLong).toBe(false);
    });

    it("enables sortByPrice and disables other sorts", () => {
      const state = { ...initialFilterState, sortByViews: true };
      const result = filterReducer(state, { type: "TOGGLE_SORT_PRICE" });

      expect(result.sortByPrice).toBe(true);
      expect(result.sortByViews).toBe(false);
    });

    it("enables sortByDurationShort and disables other sorts", () => {
      const state = { ...initialFilterState, sortByViews: true };
      const result = filterReducer(state, { type: "TOGGLE_SORT_DURATION_SHORT" });

      expect(result.sortByDurationShort).toBe(true);
      expect(result.sortByViews).toBe(false);
      expect(result.sortByDurationLong).toBe(false);
    });

    it("enables sortByDurationLong and disables other sorts", () => {
      const state = { ...initialFilterState, sortByDurationShort: true };
      const result = filterReducer(state, { type: "TOGGLE_SORT_DURATION_LONG" });

      expect(result.sortByDurationLong).toBe(true);
      expect(result.sortByDurationShort).toBe(false);
    });

    it("toggles off when already active", () => {
      const state = { ...initialFilterState, sortByViews: true };
      const result = filterReducer(state, { type: "TOGGLE_SORT_VIEWS" });
      expect(result.sortByViews).toBe(false);
    });
  });

  describe("tags dropdown", () => {
    it("toggles tags dropdown open", () => {
      const result = filterReducer(initialFilterState, { type: "TOGGLE_TAGS_DROPDOWN" });
      expect(result.showTagsDropdown).toBe(true);
    });

    it("toggles tags dropdown closed", () => {
      const state = { ...initialFilterState, showTagsDropdown: true };
      const result = filterReducer(state, { type: "TOGGLE_TAGS_DROPDOWN" });
      expect(result.showTagsDropdown).toBe(false);
    });

    it("closes tags dropdown explicitly", () => {
      const state = { ...initialFilterState, showTagsDropdown: true };
      const result = filterReducer(state, { type: "CLOSE_TAGS_DROPDOWN" });
      expect(result.showTagsDropdown).toBe(false);
    });
  });

  describe("CLEAR_ALL", () => {
    it("resets all filters to initial state", () => {
      const dirtyState = {
        ...initialFilterState,
        searchQuery: "test search",
        selectedTags: ["a", "b"],
        showPremiumOnly: true,
        showPaidOnly: true,
        showDiscountedOnly: true,
        showPurchasedOnly: true,
        sortByViews: true,
        showTagsDropdown: true,
      };

      const result = filterReducer(dirtyState, { type: "CLEAR_ALL" });

      expect(result.selectedTags).toEqual([]);
      expect(result.showPremiumOnly).toBe(false);
      expect(result.showPaidOnly).toBe(false);
      expect(result.showDiscountedOnly).toBe(false);
      expect(result.showPurchasedOnly).toBe(false);
      expect(result.sortByViews).toBe(false);
      expect(result.sortByPrice).toBe(false);
      expect(result.sortByDurationShort).toBe(false);
      expect(result.sortByDurationLong).toBe(false);
    });

    it("preserves search query when clearing filters", () => {
      const state = {
        ...initialFilterState,
        searchQuery: "keep this",
        showPremiumOnly: true,
      };

      const result = filterReducer(state, { type: "CLEAR_ALL" });
      expect(result.searchQuery).toBe("keep this");
    });
  });

  describe("unknown action", () => {
    it("returns current state for unknown action", () => {
      const state = { ...initialFilterState, showPremiumOnly: true };
      const result = filterReducer(state, { type: "UNKNOWN_ACTION" });
      expect(result).toEqual(state);
    });
  });
});
