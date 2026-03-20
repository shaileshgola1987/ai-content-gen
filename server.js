/**
 * AI Content Generator - Node.js Server
 * Uses open-source AI model APIs (Ollama, HuggingFace, OpenRouter)
 * No npm dependencies required — uses Node 18+ built-in fetch
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const dotenv = require('dotenv');
dotenv.config();


// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
  port: process.env.PORT || 3000,

  // Open-source model endpoints — swap to your preferred provider
  providers: {
    ollama: {
      baseUrl: process.env.OLLAMA_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3",
    },
    huggingface: {
      baseUrl: "https://api-inference.huggingface.co/models",
      model: process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.2",
      apiKey: process.env.HF_API_KEY || "",
    },
    openrouter: {
      baseUrl: "https://openrouter.ai/api/v1",
      model: process.env.OR_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
      apiKey: process.env.OR_API_KEY || "",
    },
    anthropic: {
      baseUrl: "https://api.anthropic.com/v1",
      model: "claude-sonnet-4-20250514",
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    },
  },

  defaultProvider: process.env.DEFAULT_PROVIDER || "openrouter",
};

// ─── Content Type Prompts ──────────────────────────────────────────────────────
const PROMPTS = {
  about_us: ({ company, industry, tone, keywords }) => `
You are a professional copywriter. Write a compelling "About Us" page for a company.

Company Name: ${company}
Industry: ${industry}
Tone: ${tone}
Keywords to include: ${keywords}

Write 3–4 engaging paragraphs covering:
1. Company origin and mission
2. Core values and what sets them apart
3. Team/culture description
4. Vision for the future
5. Write 100% unique
6. Plagiarism Free
7. SEO-optimized content
8. Human-like content that does NOT appear AI-generated

Return ONLY the content, no headings like "About Us".`,

  product_description: ({ product, features, audience, tone }) => `
You are an expert product copywriter. Write a captivating product description.

Product Name: ${product}
Key Features: ${features}
Target Audience: ${audience}
Tone: ${tone}

Write a 2–3 paragraph product description that:
1. Opens with a compelling hook
2. Highlights benefits (not just features)
3. Closes with a persuasive call-to-action

Return ONLY the product description.`,

  product_specification: ({ product, features, category }) => `
You are a technical writer. Create a detailed product specification document.

Product: ${product}
Category: ${category}
Features/Details: ${features}

Generate a structured specification with these sections:
- Overview
- Key Specifications (as a bullet list)
- Technical Details
- Package Contents
- Warranty & Support

Use clear, precise technical language. Return ONLY the specification content.`,

  technical_specification: ({ product, techStack, platform, details }) => `
You are a senior technical documentation engineer. Write a comprehensive technical specification.

Product/System: ${product}
Technology Stack: ${techStack}
Platform: ${platform}
Additional Details: ${details}

Include:
- System Architecture Overview
- Technical Requirements (hardware/software)
- API / Integration Details
- Performance Benchmarks
- Security Specifications
- Compatibility Matrix

Be precise and use technical terminology. Return ONLY the technical specification.`,

  seo_meta: ({ page, keywords, business, description }) => `
You are an SEO expert. Generate optimized meta content.

Page Type: ${page}
Business/Product: ${business}
Focus Keywords: ${keywords}
Page Description: ${description}

Generate the following and return as valid JSON only (no markdown, no explanation):
{
  "meta_title": "55-60 char SEO title with primary keyword",
  "meta_description": "150-160 char compelling description with CTA",
  "og_title": "Open Graph title for social sharing",
  "og_description": "Open Graph description (125 chars)",
  "twitter_title": "Twitter card title",
  "twitter_description": "Twitter card description",
  "focus_keyword": "primary target keyword",
  "secondary_keywords": ["keyword2", "keyword3", "keyword4"],
  "slug": "url-friendly-slug",
  "schema_type": "recommended Schema.org type"
}`,

  blog_intro: ({ topic, audience, tone, keywords }) => `
You are a content strategist. Write an engaging blog post introduction.

Topic: ${topic}
Target Audience: ${audience}
Tone: ${tone}
Keywords: ${keywords}

Write:
1. A hook (1–2 sentences that grab attention)
2. Context paragraph (why this matters)
3. Brief outline of what the article covers
4. Transition into the body

Return ONLY the introduction (3–4 paragraphs).`,
};

// ─── AI Provider Adapters ──────────────────────────────────────────────────────
async function callOllama(prompt, config) {
  const res = await fetch(`${config.baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      prompt,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.response;
}

async function callHuggingFace(prompt, config) {
  const res = await fetch(`${config.baseUrl}/${config.model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      inputs: `<s>[INST] ${prompt} [/INST]`,
      parameters: { max_new_tokens: 1024, temperature: 0.7 },
    }),
  });
  if (!res.ok) throw new Error(`HuggingFace error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data)
    ? data[0]?.generated_text?.split("[/INST]").pop()?.trim()
    : data.generated_text;
}

async function callOpenRouter(prompt, config) {
  console.log("Config", config);
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AI Content Generator",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.75,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(prompt, config) {
  const res = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function generateContent(contentType, fields, provider) {
  const promptFn = PROMPTS[contentType];
  if (!promptFn) throw new Error(`Unknown content type: ${contentType}`);

  const prompt = promptFn(fields);
  const providerConfig = CONFIG.providers[provider];

  let raw;
  switch (provider) {
    case "ollama":
      raw = await callOllama(prompt, providerConfig);
      break;
    case "huggingface":
      raw = await callHuggingFace(prompt, providerConfig);
      break;
    case "openrouter":
      raw = await callOpenRouter(prompt, providerConfig);
      break;
    case "anthropic":
      raw = await callAnthropic(prompt, providerConfig);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  // For SEO meta, parse JSON
  if (contentType === "seo_meta") {
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      return { type: "json", data: JSON.parse(cleaned) };
    } catch {
      return { type: "text", data: raw };
    }
  }

  return { type: "text", data: raw };
}

// ─── HTTP Server ───────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // ── API: Generate content ──────────────────────────────────────────────────
  if (pathname === "/api/generate" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const { contentType, fields, provider = CONFIG.defaultProvider } = body;

      if (!contentType || !fields) {
        return sendJSON(res, 400, { error: "contentType and fields required" });
      }

      console.log(`[GEN] type=${contentType} provider=${provider}`);
      const result = await generateContent(contentType, fields, provider);
      return sendJSON(res, 200, { success: true, result, provider });
    } catch (err) {
      console.error("[ERROR]", err.message);
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── API: Config info ───────────────────────────────────────────────────────
  if (pathname === "/api/config" && req.method === "GET") {
    return sendJSON(res, 200, {
      defaultProvider: CONFIG.defaultProvider,
      providers: Object.fromEntries(
        Object.entries(CONFIG.providers).map(([k, v]) => [
          k,
          { model: v.model, hasKey: !!(v.apiKey || k === "ollama") },
        ])
      ),
    });
  }

  // ── Static files ───────────────────────────────────────────────────────────
  let filePath =
    pathname === "/"
      ? path.join(__dirname, "public", "index.html")
      : path.join(__dirname, "public", pathname);

  const ext = path.extname(filePath);
  const mime = MIME[ext] || "text/plain";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("404 Not Found");
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.listen(CONFIG.port, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       AI Content Generator — Running         ║
║  http://0.0.0.0:${CONFIG.port}                       ║
╠══════════════════════════════════════════════╣
║  Default Provider : ${CONFIG.defaultProvider.padEnd(24)}║
║  Node.js          : ${process.version.padEnd(24)}║
╚══════════════════════════════════════════════╝
  `);
});