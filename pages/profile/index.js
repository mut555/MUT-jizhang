const storage = require('../../utils/storage');
const category = require('../../utils/category');

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    totalBills: 0,
    monthExpense: '0.00',
    monthIncome: '0.00',
    topCategory: null,
    recentBills: []
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) this.setData({ userInfo, hasUserInfo: true });
  },
  onShow() { this.loadData(); },

  loadData() {
    const allBills = storage.getBills();
    const now = new Date();
    const monthBills = storage.getMonthBills(now.getFullYear(), now.getMonth());
    const monthExpense = storage.calculateTotal(monthBills, 'expense');
    const monthIncome = storage.calculateTotal(monthBills, 'income');

    // 本月消费最多
    const stats = storage.statisticsByCategory(monthBills);
    let topCategory = null, max = 0;
    Object.keys(stats).forEach(name => {
      if (stats[name] > max) { max = stats[name]; topCategory = { name, icon: category.getCategoryIcon(name), color: category.getCategoryColor(name), amount: stats[name] }; }
    });

    const recentBills = allBills.slice(0, 3).map(b => ({
      ...b,
      icon: category.getCategoryIcon(b.category),
      color: category.getCategoryColor(b.category),
      dateStr: this.formatDate(b.createdAt)
    }));

    this.setData({ totalBills: allBills.length, monthExpense: monthExpense.toFixed(2), monthIncome: monthIncome.toFixed(2), topCategory, recentBills });
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => { wx.setStorageSync('userInfo', res.userInfo); this.setData({ userInfo: res.userInfo, hasUserInfo: true }); }
    });
  },

  clearData() {
    wx.showModal({
      title: '清除数据', content: '确定清除所有账单数据吗？', confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('bills');
          wx.removeStorageSync('userInfo');
          this.setData({ userInfo: null, hasUserInfo: false, totalBills: 0, monthExpense: '0.00', monthIncome: '0.00', topCategory: null, recentBills: [] });
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      }
    });
  },

  exportData() {
    const bills = storage.getBills();
    if (bills.length === 0) { wx.showToast({ title: '暂无数据', icon: 'none' }); return; }
    let text = '===== 智能语音记账助手 · 数据导出 =====\n\n';
    bills.forEach((b, i) => {
      const d = this.formatDate(b.createdAt);
      text += `${i + 1}. [${d}] ${b.type === 'expense' ? '支出' : '收入'} ${b.category} ¥${b.amount} - ${b.item || ''}\n`;
    });
    wx.setClipboardData({ data: text, success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' }) });
  }
});