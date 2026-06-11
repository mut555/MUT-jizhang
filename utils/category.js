// 消费分类配置 - 符合新需求命名
module.exports = {
  categories: [
    { name: '餐饮食品', icon: '🍜', color: '#1677ff' },
    { name: '交通出行', icon: '🚗', color: '#52c41a' },
    { name: '购物消费', icon: '🛒', color: '#faad14' },
    { name: '娱乐休闲', icon: '🎮', color: '#722ed1' },
    { name: '住房物业', icon: '🏠', color: '#fa5509' },
    { name: '医疗健康', icon: '💊', color: '#eb2f96' },
    { name: '学习教育', icon: '📚', color: '#13c2c2' },
    { name: '收入', icon: '💰', color: '#52c41a' },
    { name: '其他支出', icon: '📦', color: '#8c8c8c' }
  ],

  getCategoryByName(name) {
    return this.categories.find(c => c.name === name) || this.categories[7];
  },

  getCategoryColor(name) {
    const cat = this.getCategoryByName(name);
    return cat ? cat.color : '#8c8c8c';
  },

  getCategoryIcon(name) {
    const cat = this.getCategoryByName(name);
    return cat ? cat.icon : '📦';
  },

  // 获取分类列表供筛选器使用
  getAllCategories() {
    return this.categories;
  }
};