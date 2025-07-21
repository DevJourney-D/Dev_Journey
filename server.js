const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
require("dotenv").config();

const app = express();
const COUNTER_FILE = path.join(__dirname, "counter.json");

// ใช้ CORS ให้เสร็จทีเดียว
app.use(
  cors({
    origin: "https://dev-journey-app.vercel.app",
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// สำหรับ preflight OPTIONS
app.options("/api/sendmail", cors());

// Nodemailer config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ฟังก์ชันอ่าน/เขียน counter
async function readCounter() {
  try {
    return await fs.readJson(COUNTER_FILE);
  } catch {
    return { total: 0, today: {}, week: {} };
  }
}
async function writeCounter(data) {
  await fs.writeJson(COUNTER_FILE, data, { spaces: 2 });
}

// API ส่งเมล
app.post("/api/sendmail", async (req, res) => {
  const { name, email, phone, type, budget, detail } = req.body;

  // Validate ฟิลด์เบื้องต้น (กัน empty spam)
  if (!detail || detail.trim().length === 0) {
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
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "ส่งอีเมลเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Mail error:", err); // <== log error ช่วย debug
    res.status(500).json({
      success: false,
      message: "เกิดข้อผิดพลาดในการส่งอีเมล",
      error: err.toString(),
    });
  }
});

// API นับจำนวนผู้เข้าชม
app.post("/api/hit", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStr = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  let counter = await readCounter();

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

  await writeCounter(counter);

  res.json({ success: true });
});

// API ดึงจำนวนผู้เข้าชม
app.get("/api/counter", async (req, res) => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStr = (() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  let counter = await readCounter();
  res.json({
    total: counter.total || 0,
    today: Object.keys(counter.today[todayStr] || {}).length,
    week: Object.keys(counter.week[weekStr] || {}).length,
  });
});

// Railway/Vercel ต้องใช้ process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
