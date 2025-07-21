// Simple test endpoint for Vercel Functions
export default function handler(req, res) {
  res.status(200).json({ 
    message: "Hello from Vercel API!", 
    timestamp: new Date().toISOString(),
    method: req.method 
  });
}
