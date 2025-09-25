// api/config.js
export default function handler(req, res) {
  // Only allow GET from your domain
  const origin = req.headers.origin;
  const allowedHosts = [
    'https://webhub.vercel.app',
    'https://*.vercel.app', // during dev
    'http://localhost:3000'
  ];

  if (!allowedHosts.some(host => host === origin || (host.endsWith('vercel.app') && origin?.endsWith('.vercel.app')))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const API_ID = process.env.TELEGRAM_API_ID;
  const API_HASH = process.env.TELEGRAM_API_HASH;

  if (!API_ID || !API_HASH) {
    console.error("Missing env vars!");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // Send only what's needed
  res.json({
    apiId: parseInt(API_ID),
    apiHash: btoa(API_HASH), // Obfuscate slightly (Base64 ≠ encryption!)
    timestamp: Date.now()
  });
}