
export const config = {
  maxDuration: 60, // 设置超时时间为 60秒
  // 移除 runtime: 'edge'，使用默认的 Node.js 运行时，兼容性更好
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

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Node.js 模式下，req.body 会自动被 Vercel 解析 (如果 Content-Type 是 application/json)
    const { birthDate, birthTime, birthPlace } = req.body || {};

    if (!birthPlace) {
       console.error("Missing birthPlace in body:", req.body);
       return res.status(400).json({ error: "缺少必要的参数" });
    }

    console.log(`Processing request for: ${birthPlace}`);

    // --- Configuration ---
    const apiKey = process.env.API_KEY;
    let apiBaseUrl = process.env.API_BASE_URL;

    if (!apiKey) {
      console.error("Missing API_KEY env var");
      return res.status(500).json({ 
        error: '配置错误: 服务器缺少 API_KEY' 
      });
    }

    // 默认回退地址
    if (!apiBaseUrl) {
        apiBaseUrl = "https://api.openai.com/v1";
    }

    // URL 清理逻辑
    apiBaseUrl = apiBaseUrl.replace(/\/$/, ""); // 去掉末尾斜杠
    if (!apiBaseUrl.endsWith("/v1")) {
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

    // --- External API Call ---
    const payload = {
      model: "gemini-1.5-pro", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请为我批算八字，并推荐转运城市。" }
      ],
      response_format: { type: "json_object" }, 
      temperature: 0.7
    };

    console.log(`Sending request to Provider: ${apiBaseUrl}/chat/completions`);

    const apiResponse = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error("Provider Error Status:", apiResponse.status);
      console.error("Provider Error Body:", errorText);
      
      // 返回具体的错误给前端，方便调试
      return res.status(502).json({ 
        error: `上游服务报错 (${apiResponse.status}): ${errorText.substring(0, 100)}...` 
      });
    }

    const data = await apiResponse.json();
    
    // 检查数据结构
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Invalid Data Structure:", JSON.stringify(data));
        return res.status(502).json({ error: "上游服务返回的数据格式异常" });
    }

    let content = data.choices[0].message.content;
    // 清理可能存在的 Markdown 标记
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        const result = JSON.parse(content);
        return res.status(200).json(result);
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Raw Content:", content);
        return res.status(500).json({ error: "AI 生成的内容无法解析为 JSON" });
    }

  } catch (error) {
    console.error("Handler Fatal Error:", error);
    return res.status(500).json({ error: error.message || "服务器内部未知错误" });
  }
}
