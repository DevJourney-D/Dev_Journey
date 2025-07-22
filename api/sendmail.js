import nodemailer from "nodemailer";

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
  // Enable CORS for production domain
  res.setHeader('Access-Control-Allow-Origin', 'https://dev-journey-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '3600');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Sendmail API called with data:', req.body);

  const { name, email, phone, type, budget, detail } = req.body;

  // Validate ฟิลด์เบื้องต้น (กัน empty spam)
  if (!detail || detail.trim().length === 0) {
    console.log('Validation failed: No detail provided');
    return res
      .status(400)
      .json({ success: false, message: "กรุณากรอกข้อความ" });
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
