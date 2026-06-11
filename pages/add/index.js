const storage = require('../../utils/storage');
const category = require('../../utils/category');
const deepseek = require('../../utils/deepseek');

Page({
  data: {
    // 语音状态
    isRecording: false,
    voiceText: '',
    voiceResults: [],
    aiLoading: false,
    // 文字输入
    showTextInput: false,
    textInput: '',
    categories: category.categories
  },

  onLoad() {
    this.setData({ categories: category.categories });
  },

  // ========== 语音记账 ==========
  startVoice() {
    const that = this;
    this.setData({ isRecording: true, voiceText: '' });

    const recorderManager = wx.getRecorderManager();
    recorderManager.onStop((res) => {
      that.setData({ isRecording: false });
      if (!res.tempFilePath) return;

      that.setData({ aiLoading: true });

      // 尝试微信语音识别
      const plugin = requirePlugin && requirePlugin('WechatSI');
      if (plugin) {
        plugin.translateVoice({
          filePath: res.tempFilePath,
          success(translateRes) {
            const text = translateRes.result;
            that.setData({ voiceText: text });
            that.parseWithAI(text);
          },
          fail() {
            const mockTexts = [
              '喝咖啡38元 看电影35元 买豆浆18元',
              '看电影45元 不是45是35 奶茶18元',
              '打车28元 午饭42元'
            ];
            const text = mockTexts[Math.floor(Math.random() * mockTexts.length)];
            that.setData({ voiceText: text });
            that.parseWithAI(text);
          }
        });
      } else {
        // 无插件：直接用模拟文本演示
        const mockTexts = [
          '喝咖啡38元 看电影35元 买豆浆18元',
          '看电影45元 不是45是35 奶茶18元',
          '打车28元 午饭42元'
        ];
        const text = mockTexts[Math.floor(Math.random() * mockTexts.length)];
        that.setData({ voiceText: text });
        that.parseWithAI(text);
      }
    });

    recorderManager.start({
      duration: 30000,
      format: 'mp3'
    });

    // 10秒后自动停止（演示用）
    setTimeout(() => {
      if (this.data.isRecording) {
        recorderManager.stop();
      }
    }, 10000);
  },

  stopVoice() {
    wx.getRecorderManager().stop();
  },

  // AI 解析文本
  async parseWithAI(text) {
    try {
      const results = await deepseek.parseVoiceExpense(text);
      this.setData({
        aiLoading: false,
        voiceResults: results,
        voiceText: text
      });
      if (results.length === 0) {
        wx.showToast({ title: '未识别到消费，请重试', icon: 'none' });
      }
    } catch (err) {
      this.setData({ aiLoading: false });
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
    }
  },

  // 保存识别结果
  saveVoiceResults() {
    const { voiceResults } = this.data;
    if (voiceResults.length === 0) return;

    let savedCount = 0;
    voiceResults.forEach(result => {
      if (result.amount > 0) {
        storage.saveBill({
          amount: result.amount,
          category: result.category,
          item: result.item,
          description: result.correction ? '(已修正)' : '',
          type: result.type || 'expense',
          source: result.source === 'text' ? 'text' : 'voice'
        });
        savedCount++;
      }
    });

    wx.showToast({
      title: `已记录${savedCount}笔消费`,
      icon: 'success'
    });
    this.setData({ voiceResults: [], voiceText: '', textInput: '', showTextInput: false });
  },

  // 修改单条识别结果
  modifyResult(e) {
    const { index, field } = e.currentTarget.dataset;
    const { voiceResults } = this.data;
    const result = voiceResults[index];

    if (field === 'amount') {
      wx.showModal({
        title: '修改金额',
        editable: true,
        placeholderText: String(result.amount),
        success: (res) => {
          if (res.confirm && res.content) {
            voiceResults[index].amount = parseFloat(res.content) || result.amount;
            this.setData({ voiceResults });
          }
        }
      });
    } else if (field === 'category') {
      wx.showActionSheet({
        itemList: category.categories.map(c => c.name),
        success: (res) => {
          voiceResults[index].category = category.categories[res.tapIndex].name;
          this.setData({ voiceResults });
        }
      });
    }
  },

  // 删除单条识别结果
  deleteResult(e) {
    const index = e.currentTarget.dataset.index;
    const voiceResults = [...this.data.voiceResults];
    voiceResults.splice(index, 1);
    this.setData({ voiceResults });
  },

  // 重新录入
  resetVoice() {
    this.setData({
      voiceText: '',
      voiceResults: [],
      isRecording: false,
      textInput: '',
      showTextInput: false
    });
  },

  // ========== 文字输入 ==========
  toggleTextInput() {
    this.setData({ showTextInput: !this.data.showTextInput });
  },

  onTextInput(e) {
    this.setData({ textInput: e.detail.value });
  },

  parseTextInput() {
    const text = this.data.textInput.trim();
    if (!text) {
      wx.showToast({ title: '请输入描述文字', icon: 'none' });
      return;
    }
    this.setData({ aiLoading: true, voiceText: text });
    this.parseWithAI(text);
  }
});