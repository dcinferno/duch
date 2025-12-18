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
// HTML helpers (Telegram is VERY strict)
// --------------------------------------------------
const escapeHTML = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Only escape & for URLs (do NOT escape < >)
const escapeUrl = (url = "") => String(url).replace(/&/g, "&amp;");

// --------------------------------------------------
// Send Telegram message with thumbnail + button
// --------------------------------------------------
export async function sendTelegramMessage(video) {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const redirectHost = process.env.NEXT_REDIRECT_URL;
  const CDN = process.env.PUSHR_CDN_URL;

  if (!token || !channelId) {
    console.error("❌ Missing Telegram env vars");
    return;
  }

  // --------------------------------------------------
  // Build URLs safely
  // --------------------------------------------------
  const trackingUrl =
    publicBaseUrl && video._id
      ? new URL(`/api/redirect?videoId=${video._id}`, publicBaseUrl).toString()
      : null;

  const thumbnailUrl = video.thumbnail?.startsWith("http")
    ? video.thumbnail
    : `${CDN}${video.thumbnail}`;

  // --------------------------------------------------
  // Creator line (safe, no broken <a>)
  // --------------------------------------------------
  let creatorLine = `👤 ${escapeHTML(video.creatorName || "Unknown")}`;

  if (video.socialMediaUrl) {
    creatorLine = `👤 <a href="${escapeUrl(video.socialMediaUrl)}">${escapeHTML(
      video.creatorName || "Creator"
    )}</a>`;
  }

  // --------------------------------------------------
  // Optional creator page link (body link)
  // --------------------------------------------------
  let creatorPageLine = "";
  if (video.creatorUrlHandle && publicBaseUrl) {
    const creatorUrl = new URL(
      `/${video.creatorUrlHandle}`,
      publicBaseUrl
    ).toString();

    creatorPageLine = `🔗 <a href="${escapeUrl(
      creatorUrl
    )}">Visit Creator Page</a>`;
  }

  // --------------------------------------------------
  // Caption (NO newlines inside <a> tags)
  // --------------------------------------------------
  const message = `
<b>${escapeHTML(video.title || "")}</b>

${escapeHTML(video.description || "")}

${creatorLine}
${creatorPageLine}
💎 ${video.price === 0 ? "Free" : `$${video.price}`}
`.trim();

  // --------------------------------------------------
  // Build payload
  // --------------------------------------------------
  const payload = new FormData();
  payload.append("chat_id", channelId);
  payload.append("caption", message);
  payload.append("parse_mode", "HTML");

  if (trackingUrl) {
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
  }

  // --------------------------------------------------
  // Fetch thumbnail safely
  // --------------------------------------------------
  const imageRes = await safeFetch(thumbnailUrl);
  const buffer = await imageRes.arrayBuffer();
  payload.append("photo", new Blob([buffer]), "thumb.jpg");

  // --------------------------------------------------
  // Send to Telegram safely
  // --------------------------------------------------
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
