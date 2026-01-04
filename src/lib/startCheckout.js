// lib/startCheckout.js
import { getOrCreateUserId } from "./getOrCreateUserId"; // adjust import if needed

const getCheckOutUrl = () => {
  const isDev = process.env.NODE_ENV === "development";
  return isDev
    ? process.env.NEXT_PUBLIC_SERVER_URL_DEV
    : process.env.NEXT_PUBLIC_SERVER_URL;
};
export async function startCheckout(video) {
  // ✅ MUST happen synchronously for Safari
  const stripeWindow = window.open("", "_blank");

  try {
    if (!video?._id) {
      throw new Error("Missing video");
    }

    const userId = getOrCreateUserId();
    localStorage.setItem("userId", userId);

    const payload = {
      userId,
      videoId: video._id,
      creatorName: video.creatorName,
      creatorTelegramId: video.creatorTelegramId || "",
      creatorUrl: video.socialMediaUrl || "",
      site: "A",
    };

    const baseUrl = getCheckOutUrl()?.replace(/\/$/, "");
    if (!baseUrl) {
      throw new Error("Missing checkout base URL");
    }

    const res = await fetch(`${baseUrl}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data?.url) {
      throw new Error("No Stripe URL returned");
    }

    // ✅ Safari allows this because the window already exists
    stripeWindow.location = data.url;
  } catch (err) {
    stripeWindow?.close?.();
    console.error("Checkout failed", err);
    alert("Checkout failed. Please try again.");
  }
}
