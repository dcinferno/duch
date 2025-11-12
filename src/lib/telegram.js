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
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))); // exponential-ish delay
    }
  }
}

export async function sendTelegramMessage(video) {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;
  const redirectUrl = process.env.NEXT_REDIRECT_URL;
  const trackingUrl = `https://${redirectUrl}/api/redirect?videoId=${video._id}`;

  if (!token || !channelId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID");
    return;
  }

  // Format the message
  const message = `
<b>${video.title}</b>

${video.description}

👤 <a href="${video.socialMediaUrl}">${video.creatorName}</a>
💎 ${video.price === 0 ? "Free" : `$${video.price}`}
🏷️ ${video.tags?.map((t) => `#${t}`).join(" ")}
`;

  try {
    const payload = {
      chat_id: channelId,
      photo: video.thumbnail, // <-- your S3 thumbnail URL
      caption: message,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "▶️ Watch Video",
              url: trackingUrl, // your redirect-tracking link
            },
          ],
        ],
      },
    };

    // 👇 Send via Telegram API
    const res = await safeFetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.ok) {
      console.error("❌ Telegram API error:", data);
    }
    return data;
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}
