// Shared counter storage for Vercel serverless functions
// เปลี่ยนจากการเก็บ IP เป็นการนับจำนวนครั้งโดยตรง
const counter = { 
    total: 0, 
    today: 0, 
    week: 0, 
    lastDay: null, 
    lastWeek: null 
};

module.exports = { counter };
