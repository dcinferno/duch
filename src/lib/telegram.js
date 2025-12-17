// lib/telegram.js

// --------------------------------------------------
// Helper: Safe fetch with retry
// --------------------------------------------------
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

// --------------------------------------------------
// Send Telegram message with thumbnail + button
// --------------------------------------------------
export async function sendTelegramMessage(video) {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;
  const redirectHost = process.env.NEXT_REDIRECT_URL;
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const CDN = process.env.PUSHR_CDN_URL;

  if (!token || !channelId || !redirectHost) {
    console.error("❌ Missing Telegram env vars");
    return;
  }

  const trackingUrl = `https://${redirectHost}/api/redirect?videoId=${video._id}`;

  const thumbnailUrl = video.thumbnail?.startsWith("http")
    ? video.thumbnail
    : `${CDN}${video.thumbnail}`;

  const escapeHTML = (str = "") =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let creatorPageLine = "";
  if (video.creatorUrlHandle && publicBaseUrl) {
    const creatorUrl = `${publicBaseUrl.replace(/\/$/, "")}/${
      video.creatorUrlHandle
    }`;
    creatorPageLine = `\n🔗 <a href="${creatorUrl}">Visit Creator Page</a>`;
  }

  const message = `
<b>${escapeHTML(video.title)}</b>

${escapeHTML(video.description || "")}

👤 <a href="${video.socialMediaUrl}">
${escapeHTML(video.creatorName)}
</a>${creatorPageLine}

💎 ${video.price === 0 ? "Free" : `$${video.price}`}
  `.trim();

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

  const imageRes = await safeFetch(thumbnailUrl);
  const buffer = await imageRes.arrayBuffer();
  payload.append("photo", new Blob([buffer]), "thumb.jpg");

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
  }

  return data;
}
