const storage = require('../../utils/storage');
const category = require('../../utils/category');

const PAGE_SIZE = 15;

Page({
  data: {
    // 月度概览
    currentMonth: '',
    monthTotal: '0.00',
    // 筛选
    activeFilter: '全部',
    categories: category.categories,
    // 账单列表
    groupedBills: [],
    allBills: [],
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentMonth: `${now.getFullYear()}年${now.getMonth() + 1}月`
    });
  },

  onShow() {
    this.setData({ page: 1, activeFilter: '全部' });
    this.loadData();
  },

  loadData() {
    const allBills = storage.getBills();
    const now = new Date();
    const monthBills = storage.getMonthBills(now.getFullYear(), now.getMonth());
    const monthTotal = storage.calculateTotal(monthBills, 'expense');

    const filtered = this.filterBills(allBills);
    const groupedBills = this.groupByDate(filtered.slice(0, PAGE_SIZE));

    this.setData({
      allBills,
      monthTotal: monthTotal.toFixed(2),
      groupedBills,
      page: 1,
      hasMore: filtered.length > PAGE_SIZE,
      loading: false
    });
  },

  // 筛选
  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ activeFilter: filter, page: 1 });
    const filtered = this.filterBills(this.data.allBills);
    const groupedBills = this.groupByDate(filtered.slice(0, PAGE_SIZE));
    this.setData({
      groupedBills,
      hasMore: filtered.length > PAGE_SIZE
    });
  },

  filterBills(bills) {
    if (this.data.activeFilter === '全部') return bills;
    return bills.filter(b => b.category === this.data.activeFilter);
  },

  // 按日期分组
  groupByDate(bills) {
    const groups = {};
    bills.forEach(bill => {
      const dateStr = this.formatDate(bill.createdAt);
      if (!groups[dateStr]) {
        groups[dateStr] = { date: dateStr, total: 0, bills: [] };
      }
      bill.icon = category.getCategoryIcon(bill.category);
      bill.color = category.getCategoryColor(bill.category);
      bill.dateStr = this.formatTime(bill.createdAt);
      bill.displayAmount = bill.type === 'expense' ? `-¥${bill.amount}` : `+¥${bill.amount}`;
      groups[dateStr].bills.push(bill);
      if (bill.type === 'expense') groups[dateStr].total += bill.amount;
    });
    return Object.values(groups);
  },

  formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const billDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (today - billDate) / 86400000;
    const month = d.getMonth() + 1; const day = d.getDate();
    const wd = ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
    if (diff === 0) return `今天 ${month}月${day}日 ${wd}`;
    if (diff === 1) return `昨天 ${month}月${day}日 ${wd}`;
    return `${month}月${day}日 ${wd}`;
  },

  formatTime(dateStr) {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  // 触底加载
  onReachBottom() { this.loadMore(); },

  loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    const { page, allBills } = this.data;
    const filtered = this.filterBills(allBills);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const moreBills = filtered.slice(start, end);
    if (moreBills.length === 0) { this.setData({ hasMore: false }); return; }

    this.setData({ loading: true });
    const groups = this.groupByDate(moreBills);
    const groupedBills = [...this.data.groupedBills];
    groups.forEach(ng => {
      const ei = groupedBills.findIndex(g => g.date === ng.date);
      if (ei >= 0) { groupedBills[ei].bills.push(...ng.bills); groupedBills[ei].total += ng.total; }
      else groupedBills.push(ng);
    });
    this.setData({ groupedBills, page: page + 1, hasMore: end < filtered.length, loading: false });
  },

  onPullDownRefresh() {
    this.setData({ page: 1 });
    this.loadData();
    wx.stopPullDownRefresh();
  },

  // 点击账单 -> 编辑页
  editBill(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/edit/index?id=${id}` });
  },

  // 语音记账
  goToAdd() {
    wx.switchTab({ url: '/pages/add/index' });
  }
});