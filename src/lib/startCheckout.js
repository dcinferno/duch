// lib/startCheckout.js
import { getOrCreateUserId } from "./getOrCreateUserId";

const getCheckOutUrl = () => {
  const isDev = process.env.NODE_ENV === "development";
  return isDev
    ? process.env.NEXT_PUBLIC_SERVER_URL_DEV
    : process.env.NEXT_PUBLIC_SERVER_URL;
};

export async function startCheckout(item) {
  // ✅ MUST happen synchronously for Safari / iOS
  const stripeWindow = window.open("", "_blank");

  try {
    if (!item) {
      throw new Error("Missing checkout item");
    }

    const userId = getOrCreateUserId();
    localStorage.setItem("userId", userId);

    const payload = {
      userId,
      site: "A",
    };

    // -----------------------------
    // Detect bundle vs video
    // -----------------------------
    if (item.type === "bundle") {
      if (!item.bundleId) {
        throw new Error("Missing bundleId");
      }

      payload.bundleId = item.bundleId;
    } else {
      // existing video checkout (UNCHANGED behavior)
      if (!item._id) {
        throw new Error("Missing video");
      }

      payload.videoId = item._id;
      payload.creatorName = item.creatorName;
      payload.creatorUrl = item.socialMediaUrl || "";
    }

    const baseUrl = getCheckOutUrl()?.replace(/\/$/, "");
    if (!baseUrl) {
      throw new Error("Missing checkout base URL");
    }

    const res = await fetch(`${baseUrl}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Invalid checkout response");
    }

    if (!res.ok) {
      throw new Error(data?.error || "Checkout failed");
    }

    if (!data?.url) {
      throw new Error("No Stripe URL returned");
    }

    // ✅ Safari allows this because the window already exists
    stripeWindow.location = data.url;
  } catch (err) {
    stripeWindow?.close?.();
    console.error("Checkout failed", err);
    alert(`Checkout failed. Please try again.\n\n${err.message}`);
  }
}
