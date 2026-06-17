import fs from "fs";
import path from "path";

// Load env vars from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const firstEq = trimmed.indexOf("=");
      if (firstEq !== -1) {
        const key = trimmed.slice(0, firstEq).trim();
        const val = trimmed.slice(firstEq + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Error: TELEGRAM_BOT_TOKEN is not defined in your .env.local file.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const domain = args[0];

  if (!domain) {
    console.error("Usage: npx tsx scripts/set-webhook.ts <your-domain-or-ngrok-url>");
    console.error("Example: npx tsx scripts/set-webhook.ts https://my-app.vercel.app");
    process.exit(1);
  }

  // Clean domain url structure
  let cleanUrl = domain.trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    cleanUrl = "https://" + cleanUrl;
  }
  const webhookUrl = `${cleanUrl}/api/webhook/telegram`;

  console.log(`Setting Telegram Bot Webhook to: ${webhookUrl}...`);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as any;

  if (data.ok) {
    console.log("Success! Telegram Webhook updated:", data.description || "OK");
  } else {
    console.error("Error setting webhook:", data);
  }

  // Make the bot's blue menu button launch the Mini App directly, so it feels
  // like a game launcher. Pointed at /login (where Telegram auto-login runs) to
  // avoid a proxy redirect stripping initData. (Telegram requires HTTPS here.)
  const miniAppUrl = `${cleanUrl}/login`;
  if (miniAppUrl.startsWith("https://")) {
    const menuRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "🎮 بازی پیش‌بینی",
          web_app: { url: miniAppUrl },
        },
      }),
    });
    const menuData = (await menuRes.json()) as { ok: boolean; description?: string };
    console.log(
      menuData.ok ? "Menu button set to open the Mini App." : `Menu button error: ${menuData.description}`,
    );
  } else {
    console.warn("Skipping menu button: Telegram requires an HTTPS URL (got non-https).");
  }

  // Register the /start command so it shows in the bot's command menu.
  const cmdRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "start", description: "شروع و ورود به بازی پیش‌بینی جام جهانی ۲۰۲۶" },
      ],
    }),
  });
  const cmdData = (await cmdRes.json()) as { ok: boolean; description?: string };
  console.log(cmdData.ok ? "Bot commands registered." : `Commands error: ${cmdData.description}`);
}

main().catch(console.error);
