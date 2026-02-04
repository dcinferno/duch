import {
  formatDate,
  formatDuration,
  getDisplayPrice,
  isDiscounted,
  canPay,
} from "../src/lib/videoUtils";

describe("videoUtils", () => {
  describe("formatDate", () => {
    it("returns empty string for falsy input", () => {
      expect(formatDate(null)).toBe("");
      expect(formatDate(undefined)).toBe("");
      expect(formatDate("")).toBe("");
    });

    it("returns 'Today' for today's date", () => {
      const today = new Date();
      expect(formatDate(today)).toBe("Today");
    });

    it("returns 'Yesterday' for yesterday's date", () => {
      const yesterday = new Date(Date.now() - 86400000);
      expect(formatDate(yesterday)).toBe("Yesterday");
    });

    it("returns 'X days ago' for dates within a week", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
      expect(formatDate(threeDaysAgo)).toBe("3 days ago");
    });

    it("returns formatted date for older dates", () => {
      const oldDate = new Date("2024-01-15T12:00:00");
      const result = formatDate(oldDate);
      expect(result).toMatch(/Jan \d+, 2024/);
    });

    it("handles MongoDB $date format", () => {
      const mongoDate = { $date: new Date().toISOString() };
      expect(formatDate(mongoDate)).toBe("Today");
    });
  });

  describe("formatDuration", () => {
    it("returns null for falsy or zero input", () => {
      expect(formatDuration(null)).toBe(null);
      expect(formatDuration(undefined)).toBe(null);
      expect(formatDuration(0)).toBe(null);
      expect(formatDuration(-5)).toBe(null);
    });

    it("formats seconds correctly", () => {
      expect(formatDuration(30)).toBe("0:30");
      expect(formatDuration(65)).toBe("1:05");
      expect(formatDuration(125)).toBe("2:05");
      expect(formatDuration(600)).toBe("10:00");
    });

    it("pads single digit seconds with zero", () => {
      expect(formatDuration(61)).toBe("1:01");
      expect(formatDuration(69)).toBe("1:09");
    });
  });

  describe("getDisplayPrice", () => {
    it("returns displayPrice if available", () => {
      const video = { displayPrice: 9.99 };
      expect(getDisplayPrice(video)).toBe(9.99);
    });

    it("falls back to finalPrice", () => {
      const video = { finalPrice: 7.99 };
      expect(getDisplayPrice(video)).toBe(7.99);
    });

    it("falls back to basePrice", () => {
      const video = { basePrice: 5.99 };
      expect(getDisplayPrice(video)).toBe(5.99);
    });

    it("falls back to price", () => {
      const video = { price: 3.99 };
      expect(getDisplayPrice(video)).toBe(3.99);
    });

    it("returns 0 when no price fields exist", () => {
      const video = {};
      expect(getDisplayPrice(video)).toBe(0);
    });

    it("respects priority order", () => {
      const video = {
        displayPrice: 1,
        finalPrice: 2,
        basePrice: 3,
        price: 4,
      };
      expect(getDisplayPrice(video)).toBe(1);
    });
  });

  describe("isDiscounted", () => {
    it("returns true when finalPrice is less than basePrice", () => {
      const video = { basePrice: 10, finalPrice: 7 };
      expect(isDiscounted(video)).toBe(true);
    });

    it("returns false when finalPrice equals basePrice", () => {
      const video = { basePrice: 10, finalPrice: 10 };
      expect(isDiscounted(video)).toBe(false);
    });

    it("returns false when no discount", () => {
      const video = { basePrice: 10 };
      expect(isDiscounted(video)).toBe(false);
    });

    it("uses price as fallback for basePrice", () => {
      const video = { price: 10, finalPrice: 8 };
      expect(isDiscounted(video)).toBe(true);
    });

    it("returns false for video with no prices", () => {
      const video = {};
      expect(isDiscounted(video)).toBe(false);
    });
  });

  describe("canPay", () => {
    it("returns true when video has pay, fullKey, and positive price", () => {
      const video = { pay: true, fullKey: "abc123", price: 5 };
      expect(canPay(video)).toBe(true);
    });

    it("returns false when pay is false", () => {
      const video = { pay: false, fullKey: "abc123", price: 5 };
      expect(canPay(video)).toBe(false);
    });

    it("returns false when fullKey is missing", () => {
      const video = { pay: true, price: 5 };
      expect(canPay(video)).toBe(false);
    });

    it("returns false when price is 0 (free)", () => {
      const video = { pay: true, fullKey: "abc123", price: 0 };
      expect(canPay(video)).toBe(false);
    });

    it("returns false when fullKey is empty string", () => {
      const video = { pay: true, fullKey: "", price: 5 };
      expect(canPay(video)).toBe(false);
    });
  });
});
