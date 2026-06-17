import fs from "fs";
import path from "path";
import Module from "module";

// Mock 'server-only' for Node.js scripts run directly via tsx
const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (this: any, id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments as any);
};

// Load environment variables from .env.local
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

// Dynamically import modules after env vars are populated
async function main() {
  const { db } = await import("../lib/db/index");
  const { users, pushSubscriptions } = await import("../lib/db/schema");
  const { sendPushToUser } = await import("../lib/push");
  const { eq } = await import("drizzle-orm");

  const email = "sobhan.ashineh1@gmail.com";
  console.log(`Searching for user with email: ${email}...`);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    console.log(`User not found with email: ${email}. Listing first 10 users to help:`);
    const allUsers = await db.select().from(users).limit(10);
    for (const u of allUsers) {
      console.log(`- ID: ${u.id}, Phone: ${u.phone}, Name: ${u.displayName}, Email: ${u.email}`);
    }
    process.exit(0);
  }

  console.log(`Found user: ID ${user.id}, Name: ${user.displayName}, Phone: ${user.phone}`);

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, user.id));

  console.log(`Found ${subs.length} active Web Push subscription(s) for this user.`);

  if (subs.length === 0) {
    console.log("Cannot send Web Push: The user has not registered any push subscriptions in their browser.");
    console.log("Please make sure you log in to the website, go to profile, and click 'Enable Notifications' to register a subscription first!");
    process.exit(0);
  }

  console.log("Sending test push notification...");
  const sentCount = await sendPushToUser(user.id, {
    title: "تست اعلان 1ybet",
    body: "این یک اعلان آزمایشی برای حساب شما است.",
    url: "/",
  });

  console.log(`Finished sending. Successful delivery count: ${sentCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error running test push:", err);
  process.exit(1);
});
