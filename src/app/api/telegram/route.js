import { bot } from "@/lib/telegramBot.js";

export async function POST(req) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return new Response("OK");
  } catch (err) {
    console.error("❌ Telegram webhook error:", err);
    return new Response("Error", { status: 500 });
  }
}
