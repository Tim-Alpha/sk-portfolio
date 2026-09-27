# Sachin Kinha — Portfolio

Static portfolio (`index.html`, `styles.css`, `script.js`) with a contact form that forwards messages to a Telegram group.

The bot token never reaches the browser: the form posts to `/api/contact`, which runs server-side and calls the Telegram API.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Add the bot to your Telegram group and send any message in the group.
3. Get the chat id: open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id` (group ids are negative).
4. `cp .env.example .env` and fill in `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

## Run locally / self-host

```bash
npm start        # http://localhost:3000, no dependencies needed (Node 18+)
```

## Deploy on Vercel

Push the repo, import it into Vercel, and add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` under
Project → Settings → Environment Variables. `api/contact.js` is picked up automatically as a serverless function.

> GitHub Pages can't run the contact API (it only serves static files). Use Vercel, Netlify, or `server.js` on a VPS.
