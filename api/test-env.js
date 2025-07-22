export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('Environment check:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ Not set');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ Set' : '✗ Not set');
  console.log('EMAIL_RECEIVER:', process.env.EMAIL_RECEIVER ? '✓ Set' : '✗ Not set');

  res.status(200).json({
    env_check: {
      EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set', 
      EMAIL_RECEIVER: process.env.EMAIL_RECEIVER ? 'Set' : 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'undefined'
    }
  });
}
