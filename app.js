App({
  onLaunch() {
    // 首次启动写入贴近日常的模拟数据
    const bills = wx.getStorageSync('bills') || [];
    if (bills.length === 0) {
      this.initMockData();
    }
  },

  initMockData() {
    // 模拟近28天的日常消费，贴近真实生活
    // [日偏移, 金额, 分类, 项目, 类型, 来源, 时间HH]
    const mockData = [
      // 今天
      [0, 8, '餐饮食品', '豆浆油条', 'expense', 'voice', 8],
      [0, 35, '餐饮食品', '外卖午餐', 'expense', 'manual', 12],
      [0, 18, '餐饮食品', '奶茶', 'expense', 'voice', 15],
      [0, 5, '交通出行', '地铁通勤', 'expense', 'manual', 18],

      // 昨天
      [1, 10, '餐饮食品', '煎饼果子', 'expense', 'manual', 8],
      [1, 42, '餐饮食品', '和同事吃面', 'expense', 'voice', 12],
      [1, 88, '购物消费', '天猫买抽纸', 'expense', 'camera', 20],

      // 3天前
      [3, 6, '餐饮食品', '包子豆浆', 'expense', 'manual', 7],
      [3, 28, '餐饮食品', '食堂午餐', 'expense', 'manual', 12],
      [3, 45, '娱乐休闲', '电影院看电影', 'expense', 'voice', 19],
      [3, 25, '交通出行', '打车回家', 'expense', 'voice', 22],

      // 5天前
      [5, 12, '餐饮食品', '面包牛奶', 'expense', 'manual', 8],
      [5, 30, '餐饮食品', '麻辣烫', 'expense', 'manual', 12],
      [5, 99, '购物消费', '京东买耳机保护套', 'expense', 'camera', 14],

      // 7天前 (周末)
      [7, 15, '餐饮食品', '早餐馄饨', 'expense', 'manual', 9],
      [7, 120, '餐饮食品', '火锅聚餐AA', 'expense', 'voice', 18],
      [7, 60, '娱乐休闲', 'KTV唱歌AA', 'expense', 'voice', 21],
      [7, 30, '交通出行', '滴滴拼车', 'expense', 'manual', 22],

      // 10天前
      [10, 9, '餐饮食品', '手抓饼加蛋', 'expense', 'manual', 7],
      [10, 22, '餐饮食品', '黄焖鸡米饭', 'expense', 'manual', 12],

      // 12天前
      [12, 5, '交通出行', '共享单车月卡', 'expense', 'manual', 8],
      [12, 38, '餐饮食品', '螺蛳粉外卖', 'expense', 'voice', 12],
      [12, 250, '学习教育', '买了本编程书', 'expense', 'camera', 15],

      // 15天前
      [15, 11, '餐饮食品', '肉夹馍凉皮', 'expense', 'manual', 12],
      [15, 68, '购物消费', '淘宝买T恤', 'expense', 'camera', 14],
      [15, 12000, '收入', '本月工资', 'income', 'manual', 10],

      // 18天前
      [18, 7, '餐饮食品', '杂粮煎饼', 'expense', 'manual', 8],
      [18, 100, '住房物业', '交电费', 'expense', 'manual', 19],
      [18, 32, '交通出行', '滴滴去客户公司', 'expense', 'voice', 14],

      // 20天前
      [20, 14, '餐饮食品', '牛肉面加蛋', 'expense', 'manual', 12],
      [20, 26, '医疗健康', '药店买感冒灵', 'expense', 'manual', 20],

      // 22天前
      [22, 9, '餐饮食品', '包子茶叶蛋', 'expense', 'manual', 7],
      [22, 45, '餐饮食品', '水煮鱼外卖', 'expense', 'voice', 12],
      [22, 500, '收入', '接了个小副业', 'income', 'voice', 15],

      // 25天前 (月初)
      [25, 3000, '住房物业', '房租', 'expense', 'manual', 14],
      [25, 55, '餐饮食品', '新开日料店尝鲜', 'expense', 'voice', 12],
      [25, 20, '娱乐休闲', '视频会员月卡', 'expense', 'manual', 21],

      // 27天前
      [27, 16, '餐饮食品', '麻辣香锅', 'expense', 'manual', 12],
      [27, 40, '交通出行', '高铁站打车', 'expense', 'camera', 8],
    ];

    const bills = [];
    const now = new Date();

    mockData.forEach((item, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - item[0]);
      date.setHours(item[6] || 8);
      date.setMinutes(Math.floor(Math.random() * 30));

      bills.push({
        id: `d_${index}_${Date.now()}`,
        amount: item[1],
        category: item[2],
        item: item[3],
        description: '',
        type: item[4],
        source: item[5],
        createdAt: date.toISOString()
      });
    });

    wx.setStorageSync('bills', bills);
  }
});