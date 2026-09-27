// Shared contact handler: validates a form submission and forwards it to Telegram.
// Secrets come only from environment variables — they never reach the browser.

const LIMITS = { name: 100, email: 200, subject: 200, message: 4000 };

function validate(body) {
  if (!body || typeof body !== 'object') return { error: 'Invalid request' };
  // Honeypot: real users never fill the hidden "website" field.
  if (body.website) return { spam: true };

  const data = {};
  for (const [field, max] of Object.entries(LIMITS)) {
    const value = typeof body[field] === 'string' ? body[field].trim() : '';
    if (value.length > max) return { error: `${field} is too long` };
    data[field] = value;
  }
  if (!data.name || !data.email || !data.message) {
    return { error: 'Name, email and message are required' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { error: 'Please enter a valid email' };
  }
  return { data };
}

async function sendToTelegram({ name, email, subject, message }, meta = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('Telegram is not configured');

  // Plain text (no parse_mode) so user input can't break formatting.
  const text = [
    '📬 New portfolio message',
    '',
    `👤 ${name}`,
    `✉️ ${email}`,
    subject ? `📌 ${subject}` : null,
    '',
    message,
    '',
    `🕒 ${new Date().toISOString()}${meta.ip ? ` · ${meta.ip}` : ''}`,
  ].filter((line) => line !== null).join('\n');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(`Telegram error: ${json.description || res.status}`);
  }
}

// Simple in-memory rate limit: 5 messages per IP per 10 minutes.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

// Returns { status, body } so both the Vercel function and the Node server can use it.
async function handleContact(body, ip = 'unknown') {
  if (rateLimited(ip)) return { status: 429, body: { ok: false, error: 'Too many messages, try again later' } };

  const result = validate(body);
  if (result.spam) return { status: 200, body: { ok: true } };
  if (result.error) return { status: 400, body: { ok: false, error: result.error } };

  try {
    await sendToTelegram(result.data, { ip });
    return { status: 200, body: { ok: true } };
  } catch (err) {
    console.error('[contact]', err.message);
    return { status: 502, body: { ok: false, error: 'Could not deliver message, please email me instead' } };
  }
}

module.exports = { handleContact };
