// Vercel / Netlify-style serverless function: POST /api/contact
const { handleContact } = require('../lib/contact');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
  const { status, body: out } = await handleContact(body, ip);
  res.status(status).json(out);
};
