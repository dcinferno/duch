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
  const redirectUrl = "bestplay-previews.com";
  const trackingUrl = `https://${redirectUrl}/api/redirect?videoId=${video._id}`;

  if (!token || !channelId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID");
    return;
  }
  const CDN = "https://cdn.bestplay-previews.com/";
  console.log(video);
  const thumbnailUrl = video.thumbnail.startsWith("http")
    ? video.thumbnail
    : `${CDN}${video.thumbnail}`;
  console.log(thumbnailUrl);
  // Format the message
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

  // ⬇️ Fetch and attach image
  const imageRes = await fetch(thumbnailUrl);
  if (!imageRes.ok) throw new Error("Failed to fetch thumbnail");

  const buffer = await imageRes.arrayBuffer();
  payload.append("photo", new Blob([buffer]), "thumb.jpg");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    body: payload,
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("❌ Telegram API error:", data);
  }

  return data;
}
