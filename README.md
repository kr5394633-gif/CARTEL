# 🛡️ Advance Discord Security Bot

Ek advance-level Discord security bot — **Anti-Raid**, **Anti-Nuke**, **Anti-Spam**, **Auto-Moderation**,
**Verification System**, aur rich **embed-based UI** (buttons + dropdowns) ke saath.

---

## ✨ Features

- **Anti-Raid** — join spike detect kar ke server verification level auto-raise, naye/suspicious
  accounts ko quarantine role.
- **Anti-Nuke** — mass channel delete, mass role delete, mass ban detect kar ke culprit ko
  auto-strip-roles + ban. Whitelist system trusted admins ke liye.
- **Anti-Spam / Anti-Link** — message spam rate-limit, Discord invite link auto-delete, mass
  `@everyone`/mention spam block.
- **Auto-Moderation** — bad word filter + warn escalation (auto mute → kick → ban).
- **Verification System** — button-click verification panel, Verified/Unverified role assign.
- **Logging** — mod-logs, join-leave-logs, message-logs, security-alerts channels.
- **Rich Embed UI** — success (green), warning (yellow), danger (red), info (blue) embeds.
  Dropdown-based `/help`, paginated `/warns`, confirmation buttons on `/kick` & `/ban`.
- **Animated presence** — bot status har 10 second me rotate hota hai.

---

## 📁 Folder Structure

```
discord-security-bot/
├── commands/
│   ├── moderation/   (warn.js, warns.js, kick.js, ban.js, mute.js)
│   ├── security/     (security-status.js, whitelist.js, verify-setup.js)
│   └── utility/      (help.js)
├── events/           (ready, guildMemberAdd, guildMemberRemove, messageCreate,
│                       interactionCreate, channelDelete, roleDelete, guildBanAdd)
├── utils/
│   ├── database.js      — SQLite layer (warns, whitelist, alerts)
│   ├── embeds.js         — success/warning/danger/info embed builders
│   ├── logger.js         — sends embeds to log channels + persists to alerts table
│   ├── antiRaid.js       — join-spike + new-account detection
│   ├── antiNuke.js       — mass delete/ban detection + punishment
│   ├── antiSpam.js       — flood/invite-link/mass-mention detection
│   ├── autoMod.js        — bad-word filter
│   └── moderation.js     — shared warn-escalation logic
├── api/
│   └── server.js     — Express API + static server powering the RED EXE dashboard
├── public/           — RED EXE dashboard frontend (index.html, style.css, app.js)
├── assets/           (yahan apna avatar.gif rakhein)
├── data/             (bot.db - SQLite database auto-banegi)
├── config.json       (saari settings yahan customize karein)
├── .env.example
├── Procfile
├── index.js
├── deploy-commands.js
└── package.json
```

All command, event, and util files referenced above are fully implemented.

---

## 🚀 Setup Instructions (Step-by-Step)

### 1. Node.js install karein
Node.js v18 ya usse upar chahiye. Check karein: `node -v`

### 2. Dependencies install karein
```bash
npm install
```

### 3. Discord Bot Application banayein
1. [Discord Developer Portal](https://discord.com/developers/applications) par jaayein.
2. **New Application** click karein, naam dein.
3. **Bot** tab me jaake **Add Bot** karein.
4. **Reset Token** kar ke apna **Bot Token** copy karein.
5. Bot tab me neeche **Privileged Gateway Intents** me ye ON karein:
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`
6. **OAuth2 → General** se apna **Client ID** (Application ID) copy karein.

### 4. Animated Logo (GIF Avatar) lagayein
- Bot tab me **App Icon** par apna `.gif` file upload karein.
- ⚠️ Note: GIF avatar sirf tabhi **animate** hoga jab bot **Discord Verified** ho ya server
  **Level 2 boosted** ho. Warna GIF static image ki tarah dikhega — ye Discord ka limitation
  hai, code se fix nahi ho sakta.
- Apni GIF file `assets/avatar.gif` me bhi rakh lein reference ke liye.

### 5. `.env` file banayein
`.env.example` ko copy kar ke `.env` naam dein aur values bharein:
```bash
cp .env.example .env
```
```
BOT_TOKEN=aapka_bot_token
CLIENT_ID=aapka_client_id
GUILD_ID=aapke_test_server_ki_id   # optional, testing ke liye fast command sync
```

### 6. Slash Commands register karein
```bash
npm run deploy
```

### 7. Bot ko invite karein
Ye URL use karein (`YOUR_CLIENT_ID` replace karein):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1099780065526&scope=bot%20applications.commands
```
Required permissions: Manage Roles, Manage Channels, Kick Members, Ban Members, Moderate
Members (Timeout), Manage Messages, Manage Server, View Audit Log, Send Messages,
Embed Links.

### 8. Server me ye channels/roles bana lein (config.json me naam match karne chahiye)
**Channels:** `mod-logs`, `join-leave-logs`, `message-logs`, `security-alerts`
**Roles:** `Verified`, `Unverified`, `Quarantined`

> Tip: Bot ka role in sab roles se **upar** hona chahiye (role hierarchy me), warna
> role assign/remove nahi kar payega.

### 9. Bot start karein
```bash
npm start
```

### 10. (Optional) Railway par deploy karein — 24/7 hosting ke liye
1. Is folder ko ek **private** GitHub repo me push karein (`.env` `.gitignore`
   me already excluded hai — kabhi commit mat karein).
2. https://railway.app → **New Project → Deploy from GitHub repo** → apna repo select karein.
3. Railway `Procfile` (`web: node index.js`) detect kar lega aur `npm install` khud chala dega.
4. Service ke **Variables** tab me add karein: `BOT_TOKEN`, `CLIENT_ID`, aur chahe to
   `GUILD_ID`, `DASHBOARD_USER`, `DASHBOARD_PASS` (dashboard section neeche dekhein).
5. RED EXE dashboard access karne ke liye **Settings → Networking** me jaake
   **Generate Domain** click karein — Railway khud `PORT` set kar deta hai jo
   `index.js` already read karta hai.
6. **Deploy Logs** check karein — `✅ Logged in as ...` aur
   `🌐 RED EXE dashboard listening on port ...` dono dikhne chahiye.

---

## ⚙️ Customization

Sab thresholds aur toggles `config.json` me hain:
- `antiRaid.joinThreshold` / `joinWindowMs` — kitne joins kitne time me raid maane jaayenge
- `antiNuke.channelDeleteThreshold`, `roleDeleteThreshold`, `banThreshold` — anti-nuke limits
- `antiSpam.messageThreshold`, `windowMs`, `muteMinutes` — spam limits
- `autoMod.badWords` — apni khud ki bad-word list daalein
- `autoMod.warnEscalation` — kitne warns par kya action ho (mute/kick/ban)

`/whitelist add @admin` command se trusted admins ko anti-nuke se bypass de sakte hain.

---

## 🖥️ Available Commands

| Command | Description |
|---|---|
| `/help` | Dropdown menu ke saath saare commands dikhata hai |
| `/security-status` | Live protection dashboard (embed) |
| `/whitelist add/remove/list` | Trusted users manage karein |
| `/verify-setup` | Verification button panel post karein |
| `/warn @user reason` | Member ko warn karein |
| `/warns @user` | Paginated warn history (buttons se navigate) |
| `/kick @user reason` | Confirmation ke saath kick |
| `/ban @user reason` | Confirmation ke saath ban |
| `/mute @user minutes reason` | Timeout / mute |

---

## 🔴 RED EXE Web Dashboard

The bot also serves a live web dashboard called **RED EXE** — a dark
security-console UI showing real-time stats, a live security-events feed,
your whitelist, and the current protection config. It's served directly
by the same Node process (no separate hosting needed).

**What it shows:**
- Servers guarded, total members protected, uptime, live gateway ping
- A live threat feed (every anti-nuke/anti-raid/anti-spam/mod-log event,
  color-coded, newest first) — pulled from the `alerts` table so history
  survives restarts
- Current whitelist (trusted users exempt from auto-moderation)
- A read-only summary of your `config.json` protection thresholds

**How to access it:**
1. Deploy as usual (see Setup Step 10 above for Railway). The `Procfile`
   (`web: node index.js`) tells Railway to expose this as a web service —
   after deploying, go to your service's **Settings → Networking** and
   click **Generate Domain**.
2. Open the generated URL (e.g. `https://your-app.up.railway.app`) in a browser.
3. It polls the bot every 5 seconds — no refresh needed, it just updates live.

**Locally:** run `npm start`, then open `http://localhost:3000` (or whatever
`PORT` you set in `.env`).

**Securing it:** by default, anyone with the URL can view the dashboard
(read-only — it can't change any settings). To lock it down, set
`DASHBOARD_USER` and `DASHBOARD_PASS` in `.env` / your Railway variables —
the browser will then prompt for a username/password before showing
anything. Recommended if your dashboard domain is public.

**Multiple servers:** if the bot is in more than one Discord server, use
the dropdown in the top-right of the dashboard to switch which server's
feed/whitelist you're viewing.

---

## 🗄️ Database

SQLite (`better-sqlite3`) use hoti hai — file `data/bot.db` me auto-create hoti hai.
Warns, whitelist, aur per-server config sab isi me store hoti hai. MongoDB chahiye to
`utils/database.js` ko replace kar ke apna MongoDB layer laga sakte hain (same function
names rakhein: `addWarn`, `getWarns`, etc.) taaki baaki code bina change ke chalta rahe.

---

## ❓ Troubleshooting

- **Commands nahi dikh rahe?** `npm run deploy` chalayein. `GUILD_ID` set hai to turant sync
  hoga, warna global sync me ~1 hour lag sakta hai.
- **Role assign nahi ho raha?** Bot ka role, target role se upar hona chahiye.
- **Timeout/mute fail ho raha?** Bot ko `Moderate Members` permission chahiye.
- **Anti-nuke trigger nahi ho raha?** `fetchAuditLogs` ke liye bot ko `View Audit Log`
  permission chahiye.
- **`npm install` par `better-sqlite3` fail ho raha hai?** Ye ek native module hai jo
  compile hota hai — kuch hosts (jaise Replit) par build tools (`python3`, `make`,
  `g++`) chahiye hote hain. Railway aur normal VPS par usually out-of-the-box kaam
  karta hai. Agar dikkat aaye to Node version 18 ya 20 try karein (`node -v` se check
  karein), kyunki bahut naye Node versions ke saath prebuilt binaries kabhi lag ho
  sakti hain.
