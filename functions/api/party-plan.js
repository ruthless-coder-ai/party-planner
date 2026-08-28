/**
 * Cloudflare Pages Function — POST /api/party-plan
 *
 * Takes { theme, startTime, people, variantIndex } from the frontend and returns
 * a party plan object. The Gemini key lives in the GEMINI_API_KEY environment
 * variable and never reaches the browser.
 */

const MODEL = 'gemini-3.6-flash';

const SYSTEM_PROMPT = `你是一个中文派对策划助手。
根据用户提供的主题、时间、人数,为一个线下派对设计清晰的行程时间轴和物品清单。

要求:
1. timeline 给 5～8 条,覆盖从入场到结束的完整流程。
2. 如果没给开始时间,用 T+0′、T+30′ 这类相对时间表示。
3. 风格偏实际可执行,写具体怎么做,避免空洞的鸡汤话。
4. items 是真的需要采购或准备的东西,写清楚数量或规格。`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING', description: '派对标题' },
    vibe: { type: 'STRING', description: '整体氛围,例如:轻松随意 / 热闹社交 / 温馨家庭' },
    durationText: { type: 'STRING', description: '大致时长,例如:约 3 小时' },
    peopleText: { type: 'STRING', description: '人数描述,例如:10 人左右' },
    timeline: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          time: { type: 'STRING', description: '19:30 或 T+30′ 这类时间' },
          label: { type: 'STRING', description: '环节名称' },
          detail: { type: 'STRING', description: '该环节怎么进行' },
        },
        required: ['time', 'label', 'detail'],
      },
    },
    items: { type: 'ARRAY', items: { type: 'STRING' }, description: '需要准备的物品' },
    tips: { type: 'STRING', description: '整体建议或注意事项' },
  },
  required: ['title', 'vibe', 'durationText', 'peopleText', 'timeline', 'items', 'tips'],
};

const VARIANTS = ['偏基础轻松', '偏互动热闹', '偏仪式感和氛围'];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) {
    return json({ error: '服务端没有配置 GEMINI_API_KEY。' }, 501);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: '请求格式不对。' }, 400); }

  const { theme, startTime, people, variantIndex = 0 } = body || {};

  const safeTheme = String(theme || '主题派对').slice(0, 200);
  const peopleText = people ? `${String(people).slice(0, 20)} 人左右` : '人数待定';
  const timeText = startTime
    ? String(startTime).slice(0, 50)
    : '未指定,请自行假设一个合理的晚上时间,可用相对时间表示';
  const variant = VARIANTS[Number(variantIndex)] || VARIANTS[0];

  const userPrompt = `派对信息如下:
- 主题:${safeTheme}
- 参与人数:${peopleText}
- 开始时间:${timeText}
- 方案风格:${variant}

请输出一份策划方案。`;

  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
        },
      }),
    }
  );

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    const message = data?.error?.message || `上游错误 ${upstream.status}`;
    return upstream.status === 429
      ? json({ error: '请求太频繁,稍等一下再试。' }, 429)
      : json({ error: message }, 502);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return json({ error: '模型没有返回内容。' }, 502);
  }

  // responseSchema guarantees JSON, but a truncated response would still break parse.
  try {
    return json(JSON.parse(text));
  } catch {
    return json({ error: '模型输出不是合法 JSON。' }, 502);
  }
}
