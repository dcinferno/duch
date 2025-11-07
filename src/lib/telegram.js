// lib/telegram.js

export async function sendTelegramMessage(video) {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.CHANNEL_ID;

  if (!token || !channelId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID");
    return;
  }

  // Format the message
  const message = `
🎬 *${video.title}* by *${video.creatorName}*
${video.description ? `\n${video.description}` : ""}

🔗 [Watch Now](${video.url})
${video.price > 0 ? `💰 Price: $${video.price}` : "🆓 Free"}
${video.tags?.length ? `\n🏷️ Tags: ${video.tags.join(", ")}` : ""}
`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        photo: video.thumbnail,
        caption: message,
        parse_mode: "Markdown",
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
