// Simple in-memory rate limiter for Vercel Serverless Functions
// ในการใช้งานจริงควรใช้ Redis หรือ Vercel KV

const rateLimitMap = new Map();

export function rateLimit(ip, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get existing requests for this IP
  let requests = rateLimitMap.get(ip) || [];
  
  // Filter out old requests
  requests = requests.filter(timestamp => timestamp > windowStart);
  
  // Check if limit exceeded
  if (requests.length >= limit) {
    return {
      isLimited: true,
      remaining: 0,
      resetTime: requests[0] + windowMs
    };
  }
  
  // Add current request
  requests.push(now);
  rateLimitMap.set(ip, requests);
  
  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    for (const [key, value] of rateLimitMap.entries()) {
      const filtered = value.filter(timestamp => timestamp > windowStart);
      if (filtered.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, filtered);
      }
    }
  }
  
  return {
    isLimited: false,
    remaining: limit - requests.length,
    resetTime: now + windowMs
  };
}

export function getRateLimitHeaders(rateLimitResult) {
  return {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
  };
}
