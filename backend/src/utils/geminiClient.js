const logger = require("./logger");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const COOLDOWN_MINUTES = Number(process.env.GEMINI_COOLDOWN_MINUTES) || 15;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let quotaBlockedUntil = 0;

const isConfigured = () =>
  Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== "change_in_production");

const forceLocalAi = () =>
  process.env.FORCE_LOCAL_AI === "true" || process.env.FORCE_LOCAL_AI === "1";

const isQuotaBlocked = () => Date.now() < quotaBlockedUntil;

const markQuotaBlocked = () => {
  quotaBlockedUntil = Date.now() + COOLDOWN_MINUTES * 60 * 1000;
};

/**
 * Call Gemini generateContent with optional retries on 429/503.
 * @returns {{ text: string|null, rateLimited: boolean }}
 */
const callGemini = async (prompt, { generationConfig, maxRetries = 2, label = "request" } = {}) => {
  if (!isConfigured() || forceLocalAi()) {
    return { rateLimited: true, text: null };
  }

  if (isQuotaBlocked()) {
    return { rateLimited: true, text: null };
  }

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  if (generationConfig) body.generationConfig = generationConfig;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 429 || response.status === 503) {
        if (attempt < maxRetries) {
          const retryAfterSec = Number(response.headers.get("retry-after")) || 0;
          const waitMs = retryAfterSec > 0 ? retryAfterSec * 1000 : (attempt + 1) * 1500;
          logger.warn(`Gemini ${label}: rate limited, retry ${attempt + 1}/${maxRetries}`);
          await sleep(waitMs);
          continue;
        }

        markQuotaBlocked();
        logger.warn(
          `Gemini ${label}: quota exceeded — local AI for ~${COOLDOWN_MINUTES} min (set FORCE_LOCAL_AI=true to skip Gemini)`
        );
        return { rateLimited: true, text: null };
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`Gemini API ${response.status}${errBody ? `: ${errBody.slice(0, 120)}` : ""}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text?.trim()) {
        return { rateLimited: false, text: text.trim() };
      }

      throw new Error("Gemini returned an empty response");
    } catch (err) {
      if (attempt < maxRetries && /fetch failed|ECONNRESET|ETIMEDOUT/i.test(err.message)) {
        await sleep(1000);
        continue;
      }
      throw err;
    }
  }

  markQuotaBlocked();
  return { rateLimited: true, text: null };
};

/**
 * Call Gemini Vision with an inline base64 image
 * @param {string} prompt - Text prompt
 * @param {string} base64Image - Base64 string WITHOUT the data URI prefix
 * @param {string} mimeType - e.g. "image/png"
 */
const callGeminiVision = async (prompt, base64Image, mimeType = "image/png", { maxRetries = 1, label = "vision" } = {}) => {
  if (!isConfigured() || forceLocalAi()) {
    return { rateLimited: true, text: null };
  }
  if (isQuotaBlocked()) {
    return { rateLimited: true, text: null };
  }

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Image } }
        ]
      }
    ]
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.status === 429 || response.status === 503) {
        if (attempt < maxRetries) {
          await sleep(1500);
          continue;
        }
        markQuotaBlocked();
        return { rateLimited: true, text: null };
      }

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        throw new Error(`Gemini Vision API ${response.status}${errBody ? `: ${errBody.slice(0, 120)}` : ""}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text?.trim()) {
        return { rateLimited: false, text: text.trim() };
      }
      throw new Error("Gemini returned an empty vision response");
    } catch (err) {
      if (attempt < maxRetries) {
        await sleep(1000);
        continue;
      }
      throw err;
    }
  }
  markQuotaBlocked();
  return { rateLimited: true, text: null };
};

module.exports = {
  callGemini,
  callGeminiVision,
  isConfigured,
  forceLocalAi,
  isQuotaBlocked,
  GEMINI_MODEL,
};
