
export const config = {
  runtime: 'nodejs', // 明确指定使用 Node.js 运行时 (比 Edge 更稳定，兼容性更好)
  maxDuration: 60,   // 设置超时时间
};

// 在 "type": "module" 模式下，Vercel 期望默认导出是一个接收 Request 对象并返回 Response 对象的函数
export default async function handler(request) {
  // --- 1. 处理 CORS (Web API 方式) ---
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  };

  // 处理预检请求 (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 只允许 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // --- 2. 解析请求体 (Web API 方式) ---
    // 必须使用 await request.json() 而不是 req.body
    const body = await request.json().catch(() => ({})); 
    const { birthDate, birthTime, birthPlace } = body;

    console.log(`Processing request for: ${birthPlace}`);

    if (!birthPlace) {
       return new Response(JSON.stringify({ error: "缺少必要的参数: birthPlace" }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       });
    }

    // --- 3. 配置检查 ---
    const apiKey = process.env.API_KEY;
    let apiBaseUrl = process.env.API_BASE_URL;

    if (!apiKey) {
      console.error("Server Error: Missing API_KEY");
      return new Response(JSON.stringify({ error: '配置错误: 服务器缺少 API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 默认回退地址
    if (!apiBaseUrl) apiBaseUrl = "https://api.openai.com/v1";
    // URL 清理
    apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
    if (!apiBaseUrl.endsWith("/v1")) apiBaseUrl = `${apiBaseUrl}/v1`;

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

    // --- 4. 调用外部 API ---
    const payload = {
      model: "gemini-1.5-pro", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请为我批算八字，并推荐转运城市。" }
      ],
      response_format: { type: "json_object" }, 
      temperature: 0.7
    };

    console.log(`Sending request to: ${apiBaseUrl}/chat/completions`);

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
      console.error(`Provider Error (${apiResponse.status}):`, errorText);
      
      return new Response(JSON.stringify({ 
        error: `上游服务报错 (${apiResponse.status})。请检查 Key 或 URL。` 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await apiResponse.json();
    
    // 检查数据结构
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return new Response(JSON.stringify({ error: "上游服务返回的数据格式异常" }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    let content = data.choices[0].message.content;
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        const result = JSON.parse(content);
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        return new Response(JSON.stringify({ error: "AI 生成内容无法解析为 JSON" }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error("Handler Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message || "服务器内部未知错误" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}