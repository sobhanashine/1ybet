import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tournamentMembers, users } from "@/lib/db/schema";
import { parsePaymentCallbackData } from "@/lib/tournament-payment";

type TelegramCallbackQuery = {
  id: string;
  from?: { id?: number };
  data?: string;
};

async function callTelegram(token: string, method: string, payload: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function handlePaymentCallback(token: string, callback: TelegramCallbackQuery) {
  const telegramId = callback.from?.id?.toString();
  const status = telegramId && callback.data
    ? parsePaymentCallbackData(callback.data, telegramId, token)
    : null;

  if (!telegramId || !status) {
    await callTelegram(token, "answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "این درخواست معتبر نیست.",
      show_alert: true,
    });
    return;
  }

  const [member] = await db
    .select({ userId: tournamentMembers.userId })
    .from(tournamentMembers)
    .innerJoin(users, eq(users.id, tournamentMembers.userId))
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  if (!member) {
    await callTelegram(token, "answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "عضویت تورنومنت برای این حساب پیدا نشد.",
      show_alert: true,
    });
    return;
  }

  await db
    .update(tournamentMembers)
    .set({ paymentStatus: status, paymentRespondedAt: new Date() })
    .where(eq(tournamentMembers.userId, member.userId));

  await callTelegram(token, "answerCallbackQuery", {
    callback_query_id: callback.id,
    text: status === "PAID" ? "ثبت شد: پرداخت کرده‌ام ✅" : "ثبت شد: هنوز پرداخت نکرده‌ام",
    show_alert: true,
  });
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Token not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();

    if (body.callback_query) {
      await handlePaymentCallback(token, body.callback_query as TelegramCallbackQuery);
      return NextResponse.json({ ok: true });
    }

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

        // Send confirmation message back to Telegram containing the Web App button
        await callTelegram(token, "sendMessage", {
          chat_id: chatId,
          text: "خوش آمدید! برای پیش‌بینی مسابقات جام جهانی ۲۰۲۶ و ورود به برنامه ۱ای‌بت روی دکمه زیر کلیک کنید:",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "⚽️ ورود به برنامه 1ybet",
                  web_app: { url: webAppUrl },
                },
              ],
            ],
          },
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
