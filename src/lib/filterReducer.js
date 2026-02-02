export const initialFilterState = {
  searchQuery: "",
  selectedTags: [],
  showPremiumOnly: false,
  showPaidOnly: false,
  showDiscountedOnly: false,
  showPurchasedOnly: false,
  sortByViews: false,
  sortByPrice: false,
  sortByDurationShort: false,
  sortByDurationLong: false,
  showTagsDropdown: false,
  showShadowGames: false,
};

export function filterReducer(state, action) {
  switch (action.type) {
    case "SET_SEARCH":
      return { ...state, searchQuery: action.payload };

    case "TOGGLE_TAG": {
      const tag = action.payload;
      const exists = state.selectedTags.includes(tag);
      return {
        ...state,
        selectedTags: exists
          ? state.selectedTags.filter((t) => t !== tag)
          : [...state.selectedTags, tag],
      };
    }

    case "TOGGLE_PREMIUM":
      return { ...state, showPremiumOnly: !state.showPremiumOnly };

    case "TOGGLE_PAID":
      return { ...state, showPaidOnly: !state.showPaidOnly };

    case "TOGGLE_DISCOUNTED":
      return { ...state, showDiscountedOnly: !state.showDiscountedOnly };

    case "TOGGLE_PURCHASED":
      return { ...state, showPurchasedOnly: !state.showPurchasedOnly };

    case "TOGGLE_SHADOW_GAMES":
        return { ...state, showShadowGames: !state.showShadowGames };
    case "TOGGLE_SORT_VIEWS":
      return {
        ...state,
        sortByViews: !state.sortByViews,
        sortByPrice: false,
        sortByDurationShort: false,
        sortByDurationLong: false,
      };

    case "TOGGLE_SORT_PRICE":
      return {
        ...state,
        sortByPrice: !state.sortByPrice,
        sortByViews: false,
        sortByDurationShort: false,
        sortByDurationLong: false,
      };

    case "TOGGLE_SORT_DURATION_SHORT":
      return {
        ...state,
        sortByDurationShort: !state.sortByDurationShort,
        sortByDurationLong: false,
        sortByViews: false,
        sortByPrice: false,
      };

    case "TOGGLE_SORT_DURATION_LONG":
      return {
        ...state,
        sortByDurationLong: !state.sortByDurationLong,
        sortByDurationShort: false,
        sortByViews: false,
        sortByPrice: false,
      };

    case "TOGGLE_TAGS_DROPDOWN":
      return { ...state, showTagsDropdown: !state.showTagsDropdown };

    case "CLOSE_TAGS_DROPDOWN":
      return { ...state, showTagsDropdown: false };

    case "CLEAR_ALL":
      return {
        ...initialFilterState,
        searchQuery: state.searchQuery, // preserve search
      };

    case "SET_FROM_URL":
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
}
