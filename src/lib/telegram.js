// lib/telegram.js

// --- Helper: Safe fetch with retry ---
async function safeFetch(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Bad response: ${res.status} - ${text}`);
      }
      return res;
    } catch (err) {
      console.warn(`⚠️ Telegram fetch attempt ${i + 1} failed:`, err.message);
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

export async function sendTelegramMessage(video) {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;
  const redirectUrl = process.env.NEXT_REDIRECT_URL;
  const CDN = process.env.PUSHR_CDN_URL;

  if (!token || !channelId) {
    console.error("❌ Missing BOT_TOKEN or CHANNEL_ID");
    return;
  }

  const trackingUrl = `https://${redirectUrl}/api/redirect?videoId=${video._id}`;

  const thumbnailUrl = video.thumbnail.startsWith("http")
    ? video.thumbnail
    : `${CDN}${video.thumbnail}`;

  // --- Escape helper ---
  const escapeHTML = (str = "") =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const message = `
<b>${escapeHTML(video.title)}</b>

${escapeHTML(video.description)}

👤 <a href="${video.socialMediaUrl}">${escapeHTML(video.creatorName)}</a>
💎 ${video.price === 0 ? "Free" : `$${video.price}`}
`;

  const payload = new FormData();
  payload.append("chat_id", channelId);
  payload.append("caption", message);
  payload.append("parse_mode", "HTML");

  payload.append(
    "reply_markup",
    JSON.stringify({
      inline_keyboard: [
        [
          {
            text: "▶️ Watch Video",
            url: trackingUrl,
          },
        ],
      ],
    })
  );

  try {
    // ✅ 1️⃣ Fetch thumbnail WITH retries
    const imageRes = await safeFetch(thumbnailUrl);
    const buffer = await imageRes.arrayBuffer();
    payload.append("photo", new Blob([buffer]), "thumb.jpg");

    // ✅ 2️⃣ Send Telegram message WITH retries
    const res = await safeFetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      {
        method: "POST",
        body: payload,
      }
    );

    const data = await res.json();

    if (!data.ok) {
      console.error("❌ Telegram API error:", data);
      return null;
    }

    return data;
  } catch (err) {
    console.error("🔥 Telegram send failed after retries:", err.message);
    return null;
  }
}
