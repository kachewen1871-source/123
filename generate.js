
import { GoogleGenAI, Type } from "@google/genai";

// Vercel Serverless Function (Node.js) 标准写法
export default async function handler(req, res) {
  // --- 1. 处理 CORS ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 仅允许 POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    // --- 2. 解析请求体 ---
    // Vercel 会自动解析 JSON body，直接使用 req.body
    const { birthDate, birthTime, birthPlace } = req.body || {};

    console.log(`Processing request for: ${birthPlace}`);

    if (!birthPlace) {
       res.status(400).json({ error: "缺少必要的参数: birthPlace" });
       return;
    }

    // --- 3. 初始化 Google GenAI ---
    // 获取并清理 API Key（防止复制粘贴时带入空格）
    const apiKey = (process.env.API_KEY || "").trim();
    if (!apiKey) {
      console.error("Server Error: Missing API_KEY");
      res.status(500).json({ error: '配置错误: 服务器缺少 API_KEY' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // --- 4. 定义 Schema 和 Prompt ---
    const systemInstruction = `你是一个精通《三命通会》与《穷通宝鉴》的玄学大师，同时也是一位熟悉中国城市地理的数据分析师。
请根据用户的八字信息，推算其命理格局，并推荐最适合其发展的中国城市。`;

    const userPrompt = `用户八字信息：${birthDate} ${birthTime} 出生于 ${birthPlace}。
请分析命理喜用神，并推荐3个适合发展的中国城市。
请严格按照 JSON 格式返回。`;

    // --- 5. 调用 Google API ---
    // 使用官方 SDK 的 Structured Output 功能
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
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

    // --- 6. 处理响应 ---
    const jsonString = response.text;
    
    let resultData;
    try {
        resultData = JSON.parse(jsonString);
    } catch (e) {
        // 清理可能存在的 Markdown 标记
        const cleanJson = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
        resultData = JSON.parse(cleanJson);
    }

    res.status(200).json(resultData);

  } catch (error) {
    console.error("Gemini API Error:", error);
    
    let errorMessage = "服务器内部错误";
    let errorDetails = error.message;

    if (error.message && error.message.includes("API_KEY")) {
        errorMessage = "API Key 无效或未配置";
    }

    res.status(500).json({ error: errorMessage, details: errorDetails });
  }
}
