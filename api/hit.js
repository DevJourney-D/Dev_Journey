// สำหรับ Vercel, ใช้ Vercel KV หรือ external database แทน file system
// ตัวอย่างนี้จะใช้ in-memory storage (จะ reset ทุกครั้งที่ deploy)
// ในการใช้งานจริงควรใช้ Vercel KV, Redis, หรือ database

import { rateLimit, getRateLimitHeaders } from '../utils/rateLimit.js';

let counter = { total: 0, today: {}, week: {} };

export default function handler(req, res) {
  // Get client IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || 
             req.headers["x-real-ip"] || 
             req.connection.remoteAddress || 
             'unknown';

  // Apply rate limiting (10 requests per minute per IP)
  const rateLimitResult = rateLimit(ip, 10, 60000);
  
  // Set rate limit headers
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Check if rate limited
  if (rateLimitResult.isLimited) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      message: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://dev-journey-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStr = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  // กันนับซ้ำ: 1 IP/วัน
  if (!counter.today[todayStr]) counter.today[todayStr] = {};
  if (!counter.week[weekStr]) counter.week[weekStr] = {};

  let isNewToday = !counter.today[todayStr][ip];
  let isNewWeek = !counter.week[weekStr][ip];

  if (isNewToday) {
    counter.today[todayStr][ip] = true;
    counter.total = (counter.total || 0) + 1;
  }
  if (isNewWeek) {
    counter.week[weekStr][ip] = true;
  }

  // ลบข้อมูลเก่า (เก็บแค่ 14 วัน)
  Object.keys(counter.today).forEach(day => {
    if ((new Date() - new Date(day)) / 864e5 > 14) delete counter.today[day];
  });
  Object.keys(counter.week).forEach(week => {
    if ((new Date() - new Date(week)) / 864e5 > 21) delete counter.week[week];
  });

  res.status(200).json({ success: true });
}
