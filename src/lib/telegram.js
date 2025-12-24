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

const escapeUrl = (url = "") => String(url).replace(/&/g, "&amp;");

// --------------------------------------------------
// Price helpers (NEW)
// --------------------------------------------------
function formatPrice(video) {
  const base = Number(video.basePrice ?? video.price ?? 0);
  const final = Number(video.finalPrice ?? base);
  const discount = video.discount;

  if (final <= 0) return "Free";

  if (discount && final < base) {
    const label = discount.label || discount.name || "Discount";
    return `<s>$${base.toFixed(2)}</s> → <b>$${final.toFixed(
      2
    )}</b> (${escapeHTML(label)})`;
  }

  return `$${final.toFixed(2)}`;
}

// --------------------------------------------------
// Send Telegram message with thumbnail + button
// --------------------------------------------------
export async function sendTelegramMessage(video) {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;
  const publicBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const CDN = process.env.PUSHR_CDN_URL;

  if (!token || !channelId) {
    console.error("❌ Missing Telegram env vars");
    return;
  }

  // --------------------------------------------------
  // URLs
  // --------------------------------------------------
  const previewUrl =
    publicBaseUrl && video._id
      ? new URL(`/api/redirect?videoId=${video._id}`, publicBaseUrl).toString()
      : null;

  const purchaseUrl =
    publicBaseUrl && video._id && video.pay && video.finalPrice > 0
      ? new URL(`/api/purchase?videoId=${video._id}`, publicBaseUrl).toString()
      : null;

  const thumbnailUrl = video.thumbnail?.startsWith("http")
    ? video.thumbnail
    : `${CDN}${video.thumbnail}`;

  // --------------------------------------------------
  // Creator line
  // --------------------------------------------------
  let creatorLine = `👤 ${escapeHTML(video.creatorName || "Unknown")}`;

  if (video.socialMediaUrl) {
    creatorLine = `👤 <a href="${escapeUrl(video.socialMediaUrl)}">${escapeHTML(
      video.creatorName || "Creator"
    )}</a>`;
  }

  // --------------------------------------------------
  // Price line (NEW)
  // --------------------------------------------------
  const priceLine = `💰 ${formatPrice(video)}`;

  // --------------------------------------------------
  // Caption
  // --------------------------------------------------
  const message = `
<b>${escapeHTML(video.title || "")}</b>

${escapeHTML(video.description || "")}

${creatorLine}
${priceLine}
`.trim();

  // --------------------------------------------------
  // Payload
  // --------------------------------------------------
  const payload = new FormData();
  payload.append("chat_id", channelId);
  payload.append("caption", message);
  payload.append("parse_mode", "HTML");

  const inlineKeyboard = [];

  if (previewUrl) {
    inlineKeyboard.push([
      {
        text: "▶️ Watch Preview",
        url: previewUrl,
      },
    ]);
  }

  if (purchaseUrl) {
    inlineKeyboard.push([
      {
        text: `💳 Buy ${
          video.finalPrice <= 0 ? "" : `$${video.finalPrice.toFixed(2)}`
        }`.trim(),
        url: purchaseUrl,
      },
    ]);
  }

  if (inlineKeyboard.length) {
    payload.append(
      "reply_markup",
      JSON.stringify({
        inline_keyboard: inlineKeyboard,
      })
    );
  }

  // --------------------------------------------------
  // Fetch thumbnail
  // --------------------------------------------------
  const imageRes = await safeFetch(thumbnailUrl);
  const buffer = await imageRes.arrayBuffer();
  payload.append("photo", new Blob([buffer]), "thumb.jpg");

  // --------------------------------------------------
  // Send
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
