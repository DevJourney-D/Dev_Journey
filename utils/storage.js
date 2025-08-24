// Shared in-memory storage for visitor counter
// ในการใช้งานจริงควรใช้ Vercel KV, Redis, หรือ database

const storage = {
  counter: { 
    total: 0, 
    today: {}, 
    week: {} 
  },
  
  getCounter() {
    return this.counter;
  },
  
  setCounter(newCounter) {
    this.counter = newCounter;
  },
  
  incrementTotal() {
    this.counter.total = (this.counter.total || 0) + 1;
    console.log('Storage: Total incremented to', this.counter.total);
  },
  
  addTodayVisitor(todayStr, ip) {
    if (!this.counter.today[todayStr]) {
      this.counter.today[todayStr] = {};
    }
    this.counter.today[todayStr][ip] = true;
    console.log(`Storage: Added visitor ${ip} for today ${todayStr}`);
  },
  
  addWeekVisitor(weekStr, ip) {
    if (!this.counter.week[weekStr]) {
      this.counter.week[weekStr] = {};
    }
    this.counter.week[weekStr][ip] = true;
    console.log(`Storage: Added visitor ${ip} for week ${weekStr}`);
  },
  
  hasVisitedToday(todayStr, ip) {
    return this.counter.today[todayStr] && this.counter.today[todayStr][ip];
  },
  
  hasVisitedThisWeek(weekStr, ip) {
    return this.counter.week[weekStr] && this.counter.week[weekStr][ip];
  },
  
  cleanOldData() {
    // ลบข้อมูลเก่า (เก็บแค่ 7 วัน สำหรับรายวัน และ 4 สัปดาห์ สำหรับรายสัปดาห์)
    const now = new Date();
    let deletedDays = 0;
    let deletedWeeks = 0;
    
    // ลบข้อมูลรายวันเก่า (เก็บแค่ 7 วัน)
    Object.keys(this.counter.today).forEach(day => {
      const daysDiff = (now - new Date(day)) / (1000 * 60 * 60 * 24);
      if (daysDiff > 7) {
        // นับจำนวน IP ที่จะถูกลบ
        const ipCount = Object.keys(this.counter.today[day]).length;
        deletedDays += ipCount;
        delete this.counter.today[day];
      }
    });
    
    // ลบข้อมูลสัปดาห์เก่า (เก็บแค่ 4 สัปดาห์)
    Object.keys(this.counter.week).forEach(week => {
      const weeksDiff = (now - new Date(week)) / (1000 * 60 * 60 * 24 * 7);
      if (weeksDiff > 4) {
        deletedWeeks += Object.keys(this.counter.week[week]).length;
        delete this.counter.week[week];
      }
    });
    
    // ปรับ total counter ถ้ามีการลบข้อมูล
    if (deletedDays > 0) {
      console.log(`ลบข้อมูลเก่า: ${deletedDays} รายการ`);
      // อัปเดต total ให้สอดคล้องกับข้อมูลที่เหลือ
      this.recalculateTotal();
    }
  },
  
  recalculateTotal() {
    // คำนวณ total ใหม่จากข้อมูลที่เหลืออยู่
    let newTotal = 0;
    Object.values(this.counter.today).forEach(dayData => {
      newTotal += Object.keys(dayData).length;
    });
    this.counter.total = newTotal;
  },
  
  resetCounter() {
    this.counter = { total: 0, today: {}, week: {} };
  },
  
  // ลบข้อมูลเฉพาะวัน
  clearSpecificDay(dateStr) {
    if (this.counter.today[dateStr]) {
      const deletedCount = Object.keys(this.counter.today[dateStr]).length;
      delete this.counter.today[dateStr];
      this.recalculateTotal();
      return deletedCount;
    }
    return 0;
  },
  
  // ลบข้อมูลเฉพาะสัปดาห์
  clearSpecificWeek(weekStr) {
    if (this.counter.week[weekStr]) {
      const deletedCount = Object.keys(this.counter.week[weekStr]).length;
      delete this.counter.week[weekStr];
      return deletedCount;
    }
    return 0;
  },
  
  // ดูข้อมูลสถิติทั้งหมด
  getDetailedStats() {
    const now = new Date();
    const stats = {
      total: this.counter.total || 0,
      totalDays: Object.keys(this.counter.today).length,
      totalWeeks: Object.keys(this.counter.week).length,
      dailyData: {},
      weeklyData: {}
    };
    
    // ข้อมูลรายวัน
    Object.entries(this.counter.today).forEach(([day, ips]) => {
      stats.dailyData[day] = Object.keys(ips).length;
    });
    
    // ข้อมูลรายสัปดาห์
    Object.entries(this.counter.week).forEach(([week, ips]) => {
      stats.weeklyData[week] = Object.keys(ips).length;
    });
    
    return stats;
  },
  
  getTodayCount(todayStr) {
    return Object.keys(this.counter.today[todayStr] || {}).length;
  },
  
  getWeekCount(weekStr) {
    return Object.keys(this.counter.week[weekStr] || {}).length;
  }
};

export default storage;
