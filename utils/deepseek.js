// DeepSeek API 工具模块
// 请替换为你的 DeepSeek API Key
const API_KEY = 'YOUR_DEEPSEEK_API_KEY';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `你是一个智能语音记账助手。用户会用自然语言描述消费，可能一次说多笔消费。

你需要：
1. 提取每笔消费的项目名称、金额、分类、类型
2. 分类只能是：餐饮食品、交通出行、购物消费、娱乐休闲、住房物业、医疗健康、学习教育、收入、其他支出
3. 类型：收入 如果句子包含"赚了"、"收到"、"发了"、"奖金"、"工资"、"副业"、"报销"、"退款"、"全勤"、"补贴"、"提成"；否则是 支出。收入类型的category固定为"收入"
4. 如果用户中途更正（如"不是45是35"），请修正对应的记录
5. 返回纯JSON数组，每条记录格式：
{
  "item": "消费项目",
  "amount": 金额数字,
  "category": "分类名称",
  "type": "income" 或 "expense",
  "correction": false  // 是否是对上一条的更正
}

示例输入："喝咖啡38元 看电影35元"
示例输出：[{"item":"咖啡","amount":38,"category":"餐饮食品","type":"expense","correction":false},{"item":"电影","amount":35,"category":"娱乐休闲","type":"expense","correction":false}]

示例输入（更正）："看电影45元 不是45是35"
示例输出：[{"item":"电影","amount":35,"category":"娱乐休闲","type":"expense","correction":true}]

只返回JSON数组，不要其他文字。`;

// 调用 DeepSeek 进行语音智能解析
async function parseVoiceExpense(text) {
  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        data: {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text }
          ],
          max_tokens: 500,
          temperature: 0.3
        },
        success: resolve,
        fail: reject
      });
    });

    if (response.statusCode === 200) {
      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } else if (response.statusCode === 401) {
      throw new Error('API Key 无效，请检查配置');
    } else {
      throw new Error(`API 调用失败: ${response.statusCode}`);
    }
  } catch (error) {
    // API不可用时，使用正则回退解析
    console.warn('DeepSeek API 不可用，使用本地解析:', error.message);
    return parseLocally(text);
  }
}

// 本地正则解析（API不可用时的回退方案）
function parseLocally(text) {
  const results = [];
  const sentences = text.split(/[，,。;；\n]/).filter(s => s.trim());

  sentences.forEach(s => {
    const trimmed = s.trim();
    if (!trimmed) return;

    // 强收入关键词
    const strongIncome = ['赚了','挣了','工资','发了','奖金','副业','报销','退款','补贴','提成','红包','转账','进账','稿费','利息','设计费','辛苦费','全勤'];
    // 弱收入关键词：需要结合上下文
    const weakIncome = ['收到','收了','卖了','入账'];
    // 支出关键词
    const expenseKw = ['花了','花掉','付了','支付','给了','AA','买了','消费','支出','花费','一共花'];

    // 判断类型
    let detectedType = 'expense';
    if (strongIncome.some(w => trimmed.includes(w))) {
      detectedType = 'income';
    } else if (weakIncome.some(w => trimmed.includes(w))) {
      detectedType = 'weak_income';
    } else if (expenseKw.some(w => trimmed.includes(w))) {
      detectedType = 'expense';
    }

    const pattern = /([^\d]{1,15}?)\s*(\d+(?:\.\d{1,2})?)\s*(块|元|块钱)?/g;
    let match;
    while ((match = pattern.exec(trimmed)) !== null) {
      let item = match[1].trim();
      const amount = parseFloat(match[2]);
      if (amount <= 0 || !item) continue;

      // 去除动作词
      const noiseWords = ['花了','花掉','付了','支付','给了','买了','消费','收到','收了','卖了','赚了','挣了','一共花'];
      noiseWords.forEach(w => { item = item.replace(w, ''); });
      item = item || '未知项目';

      // 弱收入词：根据项目分类判断
      let finalType = detectedType;
      if (detectedType === 'weak_income') {
        const testCat = classifyItem(item, 'expense');
        if (testCat !== '收入' && testCat !== '其他支出') {
          finalType = 'expense';
        } else {
          finalType = 'income';
        }
      }

      const category = classifyItem(item, finalType);
      results.push({ item, amount, category, type: finalType, correction: false });
    }
  });

  // 处理更正：替换最后一条金额
  const corrMatch = text.match(/不是\s*(\d+(?:\.\d{1,2})?)\s*是\s*(\d+(?:\.\d{1,2})?)/);
  if (corrMatch && results.length > 0) {
    results[results.length - 1].amount = parseFloat(corrMatch[2]);
    results[results.length - 1].correction = true;
  }

  return results;
}

// 根据关键词分类
function classifyItem(item, type) {
  if (type === 'income') return '收入';
  const rules = [
    { keywords: ['咖啡','奶茶','饭','面','菜','肉','鱼','鸡','鸭','牛','猪','虾','蟹','蛋','奶','茶','水','果','饼','包','粥','汤','甜','糖','酒','啤','饮','吃','喝','餐','外卖','食堂','火锅','烧烤','炸鸡','汉堡','薯条','寿司','披萨'], category: '餐饮食品' },
    { keywords: ['打车','滴滴','地铁','公交','火车','高铁','飞机','票','加油','停车','出行','租车','单车'], category: '交通出行' },
    { keywords: ['淘宝','京东','拼多多','买','购','衣服','鞋','裤','包','手机','电脑','电器','日用品'], category: '购物消费' },
    { keywords: ['电影','唱','歌','KTV','游戏','游乐','玩','旅游','景点','门票','运动','健身','按摩'], category: '娱乐休闲' },
    { keywords: ['租','房','水电','物业','煤气','天然气','网费','话费','装修','家具'], category: '住房物业' },
    { keywords: ['药','医院','挂号','体检','看病','牙科','手术','保险','保健'], category: '医疗健康' },
    { keywords: ['书','课','培训','学','教','考试','报名','文具'], category: '学习教育' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => item.includes(kw))) {
      return rule.category;
    }
  }
  return '其他支出';
}

// 调用 DeepSeek 进行图片识别（拍照记账）
async function classifyExpense(data) {
  const { text, imageBase64 } = data;

  let prompt = '';
  if (text) {
    prompt = `分析以下消费描述，提取金额和分类：${text}\n分类选项：餐饮食品、交通出行、购物消费、娱乐休闲、住房物业、医疗健康、学习教育、其他支出\n返回JSON：{"amount":数字,"category":"分类","item":"项目名","type":"expense/income"}`;
  } else if (imageBase64) {
    prompt = '分析这张消费凭证图片，提取金额、商户名称、消费分类、类型。返回JSON格式。';
  }

  try {
    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        data: {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.3
        },
        success: resolve,
        fail: reject
      });
    });

    if (response.statusCode === 200) {
      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return {
          amount: result.amount || 0,
          category: result.category || '其他支出',
          item: result.item || result.merchant || '',
          type: result.type || 'expense',
          confidence: 0.8
        };
      }
    }
    throw new Error('解析失败');
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw error;
  }
}

module.exports = {
  parseVoiceExpense,
  classifyExpense
};