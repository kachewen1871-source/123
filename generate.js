import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // Set CORS headers
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
    const { birthDate, birthTime, birthPlace } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      console.error("API Key is missing in environment variables");
      return res.status(500).json({ error: 'Server Config Error: API Key Missing. Please add API_KEY to Vercel Environment Variables.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
        你是一个面向大众的娱乐向命理应用后台。
        根据用户输入（${birthDate} ${birthTime} 出生于 ${birthPlace}），生成一个通俗易懂、带有商业娱乐性质的运势报告。
        
        要求：
        1. **Profile**: 将命理术语转化为直白的“人设标签”。例如，不要只说“弱火”，要说“温暖的烛光”。
        2. **Advice**: 提供一句简短有力的转运建议（少于20字）。
        3. **Recommendations**: 推荐3个适合发展的中国城市。
           - **Reason**: 极其精简，直击痛点（搞钱、恋爱、健康），少于30字。
           - **Tags**: 2个核心亮点标签，例如["搞钱圣地", "桃花旺"]。
        
        请严格按照 JSON 格式返回结果。
      `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
          bazi: {
            type: Type.OBJECT,
            properties: {
              year: { type: Type.STRING },
              month: { type: Type.STRING },
              day: { type: Type.STRING },
              hour: { type: Type.STRING },
            },
            required: ["year", "month", "day", "hour"],
          },
          profile: {
            type: Type.OBJECT,
            properties: {
              wuxing: { type: Type.STRING, description: "五行属性 (金木水火土)" },
              archetype: { type: Type.STRING, description: "五行意象/人设名称 (如：长流水)" },
              keywords: { type: Type.STRING, description: "2-3个性格关键词" },
              luckyColor: { type: Type.STRING, description: "幸运颜色" },
              luckyNumber: { type: Type.STRING, description: "幸运数字" },
              luckyDirection: { type: Type.STRING, description: "幸运方位" },
              advice: { type: Type.STRING, description: "一句话开运建议" },
            },
            required: ["wuxing", "archetype", "keywords", "luckyColor", "luckyNumber", "luckyDirection", "advice"],
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                city: { type: Type.STRING },
                province: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                reason: { type: Type.STRING, description: "简短推荐理由" },
                score: { type: Type.NUMBER },
                distance: { type: Type.NUMBER },
                dimensions: {
                  type: Type.OBJECT,
                  properties: {
                    career: { type: Type.NUMBER },
                    wealth: { type: Type.NUMBER },
                    relationship: { type: Type.NUMBER },
                    health: { type: Type.NUMBER },
                    environment: { type: Type.NUMBER },
                  },
                  required: ["career", "wealth", "relationship", "health", "environment"]
                }
              },
              required: ["city", "province", "tags", "reason", "score", "distance", "dimensions"],
            },
          },
        },
        required: ["bazi", "profile", "recommendations"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    let jsonString = response.text;
    if (jsonString.startsWith("```json")) {
        jsonString = jsonString.replace(/^```json\n/, "").replace(/\n```$/, "");
    }

    return res.status(200).json(JSON.parse(jsonString));

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "服务器正忙，请稍后重试" });
  }
}