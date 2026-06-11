const storage = require('../../utils/storage');
const category = require('../../utils/category');

Page({
  data: {
    billId: '',
    amount: '',
    type: 'expense',
    selectedCategory: '餐饮食品',
    item: '',
    billDate: '',
    categories: category.categories
  },

  onLoad(options) {
    if (options.id) {
      const bill = storage.getBillById(options.id);
      if (bill) {
        const d = new Date(bill.createdAt);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        this.setData({
          billId: bill.id,
          amount: String(bill.amount),
          type: bill.type,
          selectedCategory: bill.category,
          item: bill.item || bill.description || '',
          billDate: dateStr,
          categories: category.categories
        });
      }
    }
  },

  onAmountInput(e) {
    let value = e.detail.value.replace(/[^\d.]/g, '');
    const parts = value.split('.');
    if (parts.length > 1) value = parts[0] + '.' + parts[1].slice(0, 2);
    this.setData({ amount: value });
  },

  toggleType(e) {
    this.setData({ type: e.currentTarget.dataset.type });
  },

  selectCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.category });
  },

  onItemInput(e) {
    this.setData({ item: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ billDate: e.detail.value });
  },

  // 保存更新
  save() {
    const { billId, amount, type, selectedCategory, item, billDate } = this.data;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' });
      return;
    }
    if (!item.trim()) {
      wx.showToast({ title: '请输入项目名称', icon: 'none' });
      return;
    }

    const date = new Date(billDate);
    date.setHours(new Date().getHours());
    date.setMinutes(new Date().getMinutes());

    storage.updateBill(billId, {
      amount: numAmount,
      type,
      category: selectedCategory,
      item: item.trim(),
      description: item.trim(),
      createdAt: date.toISOString()
    });

    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1200);
  },

  // 删除账单
  deleteBill() {
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          storage.deleteBill(this.data.billId);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1200);
        }
      }
    });
  }
});