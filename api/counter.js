// ใช้ in-memory storage (ข้อมูลจะหายเมื่อ function restart)
// ในการใช้งานจริงควรใช้ Vercel KV, Redis, หรือ database
// Updated for Vercel deployment

import { rateLimit, getRateLimitHeaders } from '../utils/rateLimit.js';

let counter = { total: 0, today: {}, week: {} };

export default function handler(req, res) {
  // Get client IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || 
             req.headers["x-real-ip"] || 
             req.connection.remoteAddress || 
             'unknown';

  // Apply rate limiting (20 requests per minute per IP for counter reads)
  const rateLimitResult = rateLimit(ip, 20, 60000);
  
  // Set rate limit headers
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://dev-journey-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if rate limited
  if (rateLimitResult.isLimited) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      message: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStr = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  res.status(200).json({
    total: counter.total || 0,
    today: Object.keys(counter.today[todayStr] || {}).length,
    week: Object.keys(counter.week[weekStr] || {}).length,
  });
}
