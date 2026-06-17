import "server-only";

export async function sendTelegramMessage(telegramId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("sendTelegramMessage: TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: "HTML",
      }),
    });
    if (!res.ok) {
      console.error(`Telegram API error: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Failed to send Telegram message:", e);
    return false;
  }
}
