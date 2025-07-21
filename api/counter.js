// ใช้ in-memory storage (ข้อมูลจะหายเมื่อ function restart)
// ในการใช้งานจริงควรใช้ Vercel KV, Redis, หรือ database
// Updated for Vercel deployment

let counter = { total: 0, today: {}, week: {} };

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://dev-journey-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
