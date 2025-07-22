import nodemailer from "nodemailer";
import { rateLimit, getRateLimitHeaders } from '../utils/rateLimit.js';

// Input sanitization function
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .trim();
}

// Nodemailer config with enhanced settings
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  // Get client IP
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || 
             req.headers["x-real-ip"] || 
             req.connection.remoteAddress || 
             'unknown';

  // Apply rate limiting (10 emails per 10 minutes per IP)
  const rateLimitResult = rateLimit(ip, 10, 600000);
  
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

  // Enable CORS for production domain
  res.setHeader('Access-Control-Allow-Origin', 'https://dev-journey-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '3600');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if rate limited
  if (rateLimitResult.isLimited) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      message: 'คุณส่งอีเมลบ่อยเกินไป กรุณารอ 10 นาทีแล้วลองใหม่อีกครั้ง',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Sendmail API called with data:', req.body);

  let { name, email, phone, type, budget, detail } = req.body;

  // Sanitize inputs
  name = sanitizeInput(name);
  email = sanitizeInput(email);
  phone = sanitizeInput(phone);
  type = sanitizeInput(type);
  budget = sanitizeInput(budget);
  detail = sanitizeInput(detail);

  // Enhanced validation (ยกเว้นข้อความที่เป็น "ไม่มีข้อความ")
  if (!detail || (detail.trim().length === 0 && detail !== "ไม่มีข้อความ")) {
    console.log('Validation failed: No detail provided');
    return res
      .status(400)
      .json({ success: false, message: "กรุณากรอกข้อความ" });
  }

  if (detail.length > 5000) {
    return res
      .status(400)
      .json({ success: false, message: "ข้อความยาวเกินไป (สูงสุด 5000 ตัวอักษร)" });
  }

  // Email validation (ข้าม validation ถ้าเป็น "ไม่ระบุ")
  if (email && email !== "ไม่ระบุ" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "รูปแบบอีเมลไม่ถูกต้อง" });
  }

  const mailOptions = {
    from: `"No-Reply [เริ่มต้น Dev]" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_RECEIVER || "devj.contact@gmail.com",
    subject: `ติดต่องาน - ${name ? name : "ลูกค้าใหม่"}`,
    text: `
[แจ้งจากเว็บไซต์ เริ่มต้น Dev]
ชื่อ-นามสกุล: ${name || "-"}
อีเมล: ${email || "-"}
เบอร์ติดต่อ: ${phone || "-"}
ประเภทเว็บไซต์: ${type || "-"}
งบประมาณโดยประมาณ: ${budget || "-"}
รายละเอียดเพิ่มเติม: ${detail || "-"}
    `.trim(),
  };

  try {
    console.log('Attempting to send email with options:', mailOptions);
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    res.status(200).json({ success: true, message: "ส่งอีเมลเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Mail error details:", err);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    
    let errorMessage = "เกิดข้อผิดพลาดในการส่งอีเมล";
    
    // Handle specific error types
    if (err.code === 'EAUTH') {
      errorMessage = "ข้อผิดพลาดในการยืนยันตัวตน Email";
      console.error("Authentication failed - check EMAIL_USER and EMAIL_PASS");
    } else if (err.code === 'ECONNECTION') {
      errorMessage = "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์อีเมลได้";
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.toString() : undefined
    });
  }
}
