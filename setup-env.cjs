// Creates .env.local for MedBank (UTF-8, correct format). Run: node setup-env.cjs
const fs = require("fs");
const crypto = require("crypto");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Type your Supabase database password and press Enter: ", (pw) => {
  rl.close();
  pw = (pw || "").trim();
  if (!pw) { console.error("No password entered. Run again."); process.exit(1); }
  const url =
    "postgresql://postgres.qfyobqqpxwwuynboppjy:" +
    encodeURIComponent(pw) +
    "@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(".env.local", "DATABASE_URL=" + url + "\nAUTH_SECRET=" + secret + "\n", { encoding: "utf8" });
  console.log("\nDone. .env.local created with DATABASE_URL and a new AUTH_SECRET.");
  console.log("Now run: npm run dev");
});
