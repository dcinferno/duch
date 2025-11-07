import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.command("text", async (ctx) => {
  await ctx.reply(`You said: ${ctx.message.text}`);
});

bot.hears(/.*/, (ctx) => {
  ctx.reply(`You said: ${ctx.message.text}`);
});

export async function POST(request) {
  /*
  try {
    const body = await request.json();
    await bot.handleUpdate(body);
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
    */
  return;
}
