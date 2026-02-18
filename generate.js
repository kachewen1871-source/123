import { GoogleGenAI } from "@google/genai";

// Removing 'runtime: edge' to use default Node.js runtime for better compatibility
export const config = {
  maxDuration: 60, // Allow up to 60 seconds for generation
};

export default async function handler(req, res) {
  // Vercel serverless function (Node.js) handling
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { birthDate, birthTime, birthPlace } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      console.error("API Key is missing in server environment");
      return res.status(500).json({ error: 'Server configuration error: API Key missing' });
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
        type: 'OBJECT',
        properties: {
          bazi: {
            type: 'OBJECT',
            properties: {
              year: { type: 'STRING' },
              month: { type: 'STRING' },
              day: { type: 'STRING' },
              hour: { type: 'STRING' },
            },
            required: ["year", "month", "day", "hour"],
          },
          profile: {
            type: 'OBJECT',
            properties: {
              wuxing: { type: 'STRING', description: "五行属性 (金木水火土)" },
              archetype: { type: 'STRING', description: "五行意象/人设名称 (如：长流水)" },
              keywords: { type: 'STRING', description: "2-3个性格关键词" },
              luckyColor: { type: 'STRING', description: "幸运颜色" },
              luckyNumber: { type: 'STRING', description: "幸运数字" },
              luckyDirection: { type: 'STRING', description: "幸运方位" },
              advice: { type: 'STRING', description: "一句话开运建议" },
            },
            required: ["wuxing", "archetype", "keywords", "luckyColor", "luckyNumber", "luckyDirection", "advice"],
          },
          recommendations: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                city: { type: 'STRING' },
                province: { type: 'STRING' },
                tags: { type: 'ARRAY', items: { type: 'STRING' } },
                reason: { type: 'STRING', description: "简短推荐理由" },
                score: { type: 'NUMBER' },
                distance: { type: 'NUMBER' },
                dimensions: {
                  type: 'OBJECT',
                  properties: {
                    career: { type: 'NUMBER' },
                    wealth: { type: 'NUMBER' },
                    relationship: { type: 'NUMBER' },
                    health: { type: 'NUMBER' },
                    environment: { type: 'NUMBER' },
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

    return res.status(200).json(JSON.parse(response.text));

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}