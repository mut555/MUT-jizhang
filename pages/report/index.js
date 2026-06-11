const storage = require('../../utils/storage');
const category = require('../../utils/category');

Page({
  data: {
    selectedYear: 0,
    selectedMonth: 0,
    displayMonth: '',
    isCurrentMonth: true,
    // 月度统计
    monthTotal: '0.00',
    monthIncome: '0.00',
    avgDaily: '0.00',
    consumptionDays: 0,
    billCount: 0,
    // 图表
    categoryStats: [],
    dailyData: [],
    maxDailyAmount: 100
  },

  onLoad() {
    const now = new Date();
    this.setData({ selectedYear: now.getFullYear(), selectedMonth: now.getMonth() });
    this.loadData();
  },
  onShow() { this.loadData(); },

  prevMonth() {
    let { selectedYear, selectedMonth } = this.data;
    selectedMonth--;
    if (selectedMonth < 0) { selectedMonth = 11; selectedYear--; }
    this.setData({ selectedYear, selectedMonth });
    this.loadData();
  },
  nextMonth() {
    let { selectedYear, selectedMonth } = this.data;
    const now = new Date();
    if (selectedYear >= now.getFullYear() && selectedMonth >= now.getMonth()) {
      wx.showToast({ title: '已是本月', icon: 'none' }); return;
    }
    selectedMonth++;
    if (selectedMonth > 11) { selectedMonth = 0; selectedYear++; }
    this.setData({ selectedYear, selectedMonth });
    this.loadData();
  },

  loadData() {
    const { selectedYear, selectedMonth } = this.data;
    const now = new Date();
    const displayMonth = `${selectedYear}年${selectedMonth + 1}月`;
    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

    const monthBills = storage.getMonthBills(selectedYear, selectedMonth);
    const expenseBills = monthBills.filter(b => b.type === 'expense');
    const monthTotal = storage.calculateTotal(monthBills, 'expense');
    const monthIncome = storage.calculateTotal(monthBills, 'income');

    // 消费天数（去重）
    const days = new Set(expenseBills.map(b => new Date(b.createdAt).getDate()));
    const consumptionDays = days.size;
    const billCount = expenseBills.length;
    const avgDaily = consumptionDays > 0 ? monthTotal / consumptionDays : 0;

    // 分类统计
    const stats = storage.statisticsByCategory(expenseBills);
    const categoryStats = Object.keys(stats).map(name => ({
      name,
      icon: category.getCategoryIcon(name),
      color: category.getCategoryColor(name),
      amount: stats[name],
      percent: monthTotal > 0 ? (stats[name] / monthTotal * 100).toFixed(1) : '0.0'
    })).sort((a, b) => b.amount - a.amount);

    // 每日柱状图数据
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dailyData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayBills = monthBills.filter(b => new Date(b.createdAt).getDate() === d && b.type === 'expense');
      const total = dayBills.reduce((s, b) => s + b.amount, 0);
      dailyData.push({ day: d, amount: total });
    }
    const maxDailyAmount = Math.max(...dailyData.map(d => d.amount), 1);

    this.setData({
      displayMonth, isCurrentMonth,
      monthTotal: monthTotal.toFixed(2),
      monthIncome: monthIncome.toFixed(2),
      avgDaily: avgDaily.toFixed(2),
      consumptionDays, billCount,
      categoryStats, dailyData, maxDailyAmount
    });

    setTimeout(() => { this.drawPie(); this.drawBars(); }, 400);
  },

  // 饼图
  drawPie() {
    const query = wx.createSelectorQuery();
    query.select('#pieChart').fields({ node: true, size: true }).exec((res) => {
      if (!res[0] || !res[0].node) return;
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const w = res[0].width, h = res[0].height;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr);

      const { categoryStats, monthTotal } = this.data;
      if (monthTotal === '0.00' || categoryStats.length === 0) return;

      const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 10;
      const total = parseFloat(monthTotal);
      let angle = -Math.PI / 2;

      categoryStats.forEach(item => {
        if (item.amount <= 0) return;
        const sweep = (item.amount / total) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, angle, angle + sweep); ctx.closePath();
        ctx.fillStyle = item.color; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        if (parseFloat(item.percent) >= 5) {
          const mid = angle + sweep / 2;
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(item.percent + '%', cx + Math.cos(mid) * r * 0.65, cy + Math.sin(mid) * r * 0.65);
        }
        angle += sweep;
      });
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    });
  },

  // 柱状图
  drawBars() {
    const query = wx.createSelectorQuery();
    query.select('#barChart').fields({ node: true, size: true }).exec((res) => {
      if (!res[0] || !res[0].node) return;
      const canvas = res[0].node; const ctx = canvas.getContext('2d');
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const w = res[0].width, h = res[0].height;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.scale(dpr, dpr);

      const { dailyData, maxDailyAmount } = this.data;
      if (dailyData.length === 0) return;

      const pad = { t: 16, r: 8, b: 24, l: 36 };
      const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
      const barW = Math.max(cw / dailyData.length - 2, 2);

      dailyData.forEach((item, i) => {
        const barH = maxDailyAmount > 0 ? (item.amount / maxDailyAmount) * (ch - 4) : 0;
        const x = pad.l + i * (cw / dailyData.length) + 1;
        const y = pad.t + ch - barH;
        ctx.fillStyle = item.amount > 0 ? '#1677ff' : '#e8e8e8';
        ctx.fillRect(x, y, barW, Math.max(barH, 1));
      });

      // X轴标签：每5天
      ctx.fillStyle = '#999'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      for (let i = 0; i < dailyData.length; i += 5) {
        const x = pad.l + i * (cw / dailyData.length) + barW / 2;
        ctx.fillText(dailyData[i].day, x, h - 4);
      }
    });
  }
});