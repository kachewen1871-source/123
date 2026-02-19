
import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
};

export default async function handler(request) {
  // --- 1. 处理 CORS ---
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // --- 2. 解析请求体 ---
    const body = await request.json().catch(() => ({})); 
    const { birthDate, birthTime, birthPlace } = body;

    console.log(`Processing request for: ${birthPlace}`);

    if (!birthPlace) {
       return new Response(JSON.stringify({ error: "缺少必要的参数: birthPlace" }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       });
    }

    // --- 3. 初始化 Google GenAI ---
    // 务必确保 Vercel 环境变量中 API_KEY 是有效的 Google AI Studio Key
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("Server Error: Missing API_KEY");
      return new Response(JSON.stringify({ error: '配置错误: 服务器缺少 API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // --- 4. 定义 Schema 和 Prompt ---
    const systemInstruction = `你是一个精通《三命通会》与《穷通宝鉴》的玄学大师，同时也是一位熟悉中国城市地理的数据分析师。
请根据用户的八字信息，推算其命理格局，并推荐最适合其发展的中国城市。`;

    const userPrompt = `用户八字信息：${birthDate} ${birthTime} 出生于 ${birthPlace}。
请分析命理喜用神，并推荐3个适合发展的中国城市。
请严格按照 JSON 格式返回。`;

    // 使用官方 SDK 的 Structured Output 功能
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // 推荐使用 Flash 模型，速度快且 JSON 能力强
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bazi: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.STRING, description: "年柱 (e.g. 甲子)" },
                month: { type: Type.STRING, description: "月柱" },
                day: { type: Type.STRING, description: "日柱" },
                hour: { type: Type.STRING, description: "时柱" },
              },
            },
            profile: {
              type: Type.OBJECT,
              properties: {
                wuxing: { type: Type.STRING, description: "核心五行 (e.g. 火)" },
                archetype: { type: Type.STRING, description: "五行意象 (e.g. 山头火·璀璨)" },
                keywords: { type: Type.STRING, description: "2-3个性格关键词，用斜杠分隔" },
                luckyColor: { type: Type.STRING },
                luckyNumber: { type: Type.STRING },
                luckyDirection: { type: Type.STRING },
                advice: { type: Type.STRING, description: "一句简短有力的开运建议 (少于20字)" },
              },
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  city: { type: Type.STRING },
                  province: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reason: { type: Type.STRING, description: "推荐理由 (少于30字)" },
                  score: { type: Type.NUMBER, description: "契合度 0-100" },
                  distance: { type: Type.NUMBER, description: "距离出生地的大致公里数" },
                  dimensions: {
                    type: Type.OBJECT,
                    properties: {
                        career: { type: Type.NUMBER },
                        wealth: { type: Type.NUMBER },
                        relationship: { type: Type.NUMBER },
                        health: { type: Type.NUMBER },
                        environment: { type: Type.NUMBER },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // --- 5. 处理响应 ---
    // SDK 的 response.text 直接返回生成的 JSON 字符串
    const jsonString = response.text;
    
    // 双重保险：虽然配置了 JSON 模式，但为了防止意外，还是做一次 parse 检查
    let resultData;
    try {
        resultData = JSON.parse(jsonString);
    } catch (e) {
        // 如果偶尔包含了 Markdown 代码块，进行清理
        const cleanJson = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
        resultData = JSON.parse(cleanJson);
    }

    return new Response(JSON.stringify(resultData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // 友好的错误提示
    let errorMessage = "服务器内部错误";
    if (error.message && error.message.includes("API_KEY")) {
        errorMessage = "API Key 无效或未配置";
    } else if (error.status) {
        errorMessage = `Google API 报错: ${error.status}`;
    }

    return new Response(JSON.stringify({ error: errorMessage, details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
