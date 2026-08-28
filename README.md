# party-planner

中文派对策划助手 —— 给它一个主题、时间、人数,它返回一份行程时间轴和物品清单。

静态前端 + 一个 Cloudflare Pages Function。API key 存在服务端,浏览器看不到。

## 结构

| 路径 | 内容 |
| --- | --- |
| `index.html` | 前端,单文件,无构建步骤 |
| `functions/api/party-plan.js` | Pages Function,调用 Gemini 并返回方案 JSON |

## 部署

已经上线:**https://party-plan.pages.dev**

Cloudflare Pages 项目名是 `party-plan`(不是 `party-planner` —— 那个 pages.dev
子域被别的账号占了),已连接本仓库,推到 `main` 会自动构建部署。

项目配置:

- **Build command** —— 留空
- **Build output directory** —— `/`

环境变量在 **Settings → Environment variables** 里,production 环境需要:

| 名称 | 值 |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio 的 key(Secret 类型) |

或者用命令行设:

```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name party-plan
```

> **注意**:Pages Function 在**部署时**绑定环境变量。新设或改了 secret 之后
> 必须重新部署一次才生效,改完直接刷页面是不会变的。

没配这个变量时接口返回 501,前端会提示。

## 接口

`POST /api/party-plan`

```json
{ "theme": "生日", "startTime": "19:30", "people": 10, "variantIndex": 0 }
```

`variantIndex` 决定风格:`0` 偏基础轻松,`1` 偏互动热闹,`2` 偏仪式感和氛围。
前端的「换一个方案」按钮就是切这个值。

返回:

```json
{
  "title": "...", "vibe": "...", "durationText": "...", "peopleText": "...",
  "timeline": [{ "time": "19:30", "label": "入场 & 签到", "detail": "..." }],
  "items": ["..."],
  "tips": "..."
}
```

模型是 `gemini-3.6-flash`,用 Gemini 的 `responseSchema` 约束结构化输出,
所以返回的形状是保证的,不靠提示词里求它"只输出 JSON"。

## 历史

原来是 Express 服务端 + OpenRouter,必须本地 `node server.mjs` 才能用。
2026-08 改成 Cloudflare Pages + Gemini,前端逻辑没变。
