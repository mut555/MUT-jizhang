// 本地存储工具
const BILLS_KEY = 'bills';

// 获取所有账单
function getBills() {
  return wx.getStorageSync(BILLS_KEY) || [];
}

// 保存账单
function saveBill(bill) {
  const bills = getBills();
  bill.id = Date.now().toString();
  bill.createdAt = new Date().toISOString();
  bills.unshift(bill);
  wx.setStorageSync(BILLS_KEY, bills);
  return bill;
}

// 删除账单
function deleteBill(id) {
  const bills = getBills();
  const index = bills.findIndex(b => b.id === id);
  if (index > -1) {
    bills.splice(index, 1);
    wx.setStorageSync(BILLS_KEY, bills);
    return true;
  }
  return false;
}

// 更新账单
function updateBill(id, updates) {
  const bills = getBills();
  const index = bills.findIndex(b => b.id === id);
  if (index > -1) {
    bills[index] = { ...bills[index], ...updates };
    wx.setStorageSync(BILLS_KEY, bills);
    return bills[index];
  }
  return null;
}

// 获取单条账单
function getBillById(id) {
  const bills = getBills();
  return bills.find(b => b.id === id) || null;
}

// 获取今日账单
function getTodayBills() {
  const bills = getBills();
  const today = new Date().toDateString();
  return bills.filter(b => new Date(b.createdAt).toDateString() === today);
}

// 获取月度账单
function getMonthBills(year, month) {
  const bills = getBills();
  return bills.filter(b => {
    const date = new Date(b.createdAt);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

// 计算支出总额
function calculateTotal(bills, type = 'expense') {
  return bills
    .filter(b => b.type === type)
    .reduce((sum, b) => sum + b.amount, 0);
}

// 按分类统计
function statisticsByCategory(bills) {
  const stats = {};
  bills.filter(b => b.type === 'expense').forEach(b => {
    if (!stats[b.category]) {
      stats[b.category] = 0;
    }
    stats[b.category] += b.amount;
  });
  return stats;
}

// 按日期统计（近7天）
function statisticsByDate(bills, days = 7) {
  const result = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    
    const dayTotal = bills
      .filter(b => new Date(b.createdAt).toDateString() === dateStr && b.type === 'expense')
      .reduce((sum, b) => sum + b.amount, 0);
    
    result.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      amount: dayTotal
    });
  }
  
  return result;
}

module.exports = {
  getBills,
  saveBill,
  deleteBill,
  updateBill,
  getBillById,
  getTodayBills,
  getMonthBills,
  calculateTotal,
  statisticsByCategory,
  statisticsByDate
}
