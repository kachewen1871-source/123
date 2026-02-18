export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // --- CORS Setup ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log("Request Body:", JSON.stringify(req.body));
    const { birthDate, birthTime, birthPlace } = req.body;

    // --- Configuration ---
    const apiKey = process.env.API_KEY;
    // 获取用户配置的中转地址 (Base URL)
    let apiBaseUrl = process.env.API_BASE_URL; 

    if (!apiKey) {
      return res.status(500).json({ 
        error: '配置错误: 缺少 API_KEY。请在 Vercel 环境变量中添加。' 
      });
    }

    // 默认回退地址
    if (!apiBaseUrl) {
        apiBaseUrl = "https://api.openai.com/v1";
    }

    // 移除末尾斜杠，并确保包含 /v1 (如果用户只填了域名)
    apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    if (!apiBaseUrl.endsWith("/v1")) {
        // 智能补全: 如果用户填的是 https://2api.novai.su 但没加 v1，我们帮他加上
        // 但如果已经是完整的路径就不加
        apiBaseUrl = `${apiBaseUrl}/v1`;
    }

    const systemPrompt = `
    你是一个精通《三命通会》与《穷通宝鉴》的玄学大师，同时也是一位熟悉中国城市地理的数据分析师。
    请根据用户的八字信息（${birthDate} ${birthTime} 出生于 ${birthPlace}），推算其命理格局，并推荐最适合其发展的中国城市。

    请严格按照下方的 JSON 格式输出结果，不要输出任何 Markdown 标记（如 \`\`\`json）：

    {
      "bazi": {
        "year": "甲子 (年份干支)",
        "month": "丙寅 (月份干支)",
        "day": "戊辰 (日期干支)",
        "hour": "壬戌 (时辰干支)"
      },
      "profile": {
        "wuxing": "核心五行 (如：火)",
        "archetype": "五行意象 (如：山头火·璀璨)",
        "keywords": "2-3个性格关键词 (如：天生领袖 / 财运亨通)",
        "luckyColor": "幸运色 (如：赤红)",
        "luckyNumber": "幸运数字 (如：9)",
        "luckyDirection": "幸运方位 (如：正南)",
        "advice": "一句简短有力的开运建议 (少于20字)"
      },
      "recommendations": [
         {
            "city": "城市名 (如：深圳)",
            "province": "省份 (如：广东)",
            "tags": ["标签1", "标签2"],
            "reason": "极其精简的推荐理由，直击痛点 (少于30字)",
            "score": 95 (0-100的契合度),
            "distance": 1200 (距离出生地的大致公里数),
            "dimensions": { 
                "career": 90, 
                "wealth": 90, 
                "relationship": 80, 
                "health": 80, 
                "environment": 80 
            }
         }
         // 请提供总共 3 个推荐城市
      ]
    }
    `;

    // --- Fetch Call ---
    // 优先使用 gemini-1.5-pro，Nova AI 通常支持。
    const payload = {
      model: "gemini-1.5-pro", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请为我批算八字，并推荐转运城市。" }
      ],
      response_format: { type: "json_object" }, 
      temperature: 0.7
    };

    console.log(`Calling API: ${apiBaseUrl}/chat/completions`);

    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Provider Error:", errorText);
      
      let userMessage = `API 请求失败 (${response.status})`;
      if (response.status === 404) userMessage += ": 接口路径错误，请检查 API_BASE_URL 是否正确 (应以 /v1 结尾)。";
      if (response.status === 401) userMessage += ": API Key 无效或余额不足，请检查 Nova AI 控制台。";
      if (response.status === 429) userMessage += ": 请求过于频繁或额度耗尽。";
      
      throw new Error(userMessage);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Invalid Response Structure:", JSON.stringify(data));
        throw new Error("服务商返回数据格式异常，请稍后重试");
    }

    let content = data.choices[0].message.content;
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        const result = JSON.parse(content);
        return res.status(200).json(result);
    } catch (parseError) {
        console.error("JSON Parse Error:", content);
        throw new Error("AI 生成的数据无法解析，请重试");
    }

  } catch (error) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: error.message || "服务器内部错误" });
  }
}