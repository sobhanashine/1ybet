import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Token not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();

    // Check if the POST update contains a text message
    if (body.message && body.message.chat && body.message.text) {
      const chatId = body.message.chat.id;
      const text = body.message.text.trim();

      if (text === "/start") {
        // Launch the Mini App at /login. Telegram appends initData as a URL
        // fragment (#tgWebAppData=…); pointing straight at /login avoids a proxy
        // redirect that could strip that fragment and break auto-login. The login
        // page instant-logs-in linked users and forwards them into the game.
        const host = req.headers.get("host") || "";
        const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
        const webAppUrl = `${protocol}://${host}/login`;

        const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;

        // Send confirmation message back to Telegram containing the Web App button
        await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "خوش آمدید! برای پیش‌بینی مسابقات جام جهانی ۲۰۲۶ و ورود به برنامه ۱ای‌بت روی دکمه زیر کلیک کنید:",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "⚽️ ورود به برنامه 1ybet",
                    web_app: { url: webAppUrl }
                  }
                ]
              ]
            }
          })
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram Webhook Error:", e);
    // Always return 200 to Telegram to avoid infinite retry loops from failed webhook payloads
    return NextResponse.json({ ok: true });
  }
}
