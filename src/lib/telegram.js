// lib/telegram.js

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
🎥 <a href="${trackingUrl}">Watch Video</a>
`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        photo: video.thumbnail,
        caption: message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("Telegram API error:", data);
    }
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}
