import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { findScreenshotFile } from "../config-helpers.ts";
import { MAX_MEDIA_BODY_BYTES, readBody, sendRequestError } from "../http.ts";
import { aiRateLimiter, getClientIp } from "../rate-limit.ts";
import type { Handler, StudioApi, StudioPaths } from "../types.ts";
import { getSessionIdFromRequest, resolveWorkspacePaths } from "../workspace.ts";

/** Finds and loads GEMINI_API_KEY from process.env or .env file in config dir, workspace root, or cwd */
export function getGeminiApiKey(paths?: StudioPaths): string | undefined {
  if (process.env.GEMINI_API_KEY?.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }

  const envCandidates: string[] = [];
  if (paths?.configPath) {
    envCandidates.push(join(dirname(paths.configPath), ".env"));
  }
  envCandidates.push(
    join(process.cwd(), ".env"),
    join(process.cwd(), "..", ".env"),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env"),
  );

  for (const envPath of envCandidates) {
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, "utf8");
        const match = content.match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n#]+)["']?/m);
        if (match?.[1]?.trim()) {
          const key = match[1].trim();
          process.env.GEMINI_API_KEY = key;
          return key;
        }
      } catch {}
    }
  }
  return undefined;
}

/** Downsamples screenshot to max ~640px JPEG to drastically reduce upload payload size and latency */
export async function optimizeScreenshotForAi(
  imageBuffer: Buffer,
  maxDimension = 640,
): Promise<{ base64: string; mimeType: string }> {
  try {
    const img = await loadImage(imageBuffer);
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const jpegBuffer = canvas.toBuffer("image/jpeg", 75);
    return {
      base64: jpegBuffer.toString("base64"),
      mimeType: "image/jpeg",
    };
  } catch {
    return {
      base64: imageBuffer.toString("base64"),
      mimeType: "image/png",
    };
  }
}

/** Handles POST /api/ai/generate-copy for visual screenshot analysis and ASO copy generation with Gemini Vision. */
export function aiCopyHandler(api: StudioApi, rateLimiter = aiRateLimiter): Handler {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("POST only");
      return;
    }

    const clientIp = getClientIp(req);
    const rateCheck = rateLimiter.check(clientIp);

    res.setHeader("X-RateLimit-Limit", String(rateCheck.limit));
    res.setHeader("X-RateLimit-Remaining", String(rateCheck.remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(rateCheck.resetTime / 1000)));

    if (!rateCheck.allowed) {
      res.statusCode = 429;
      res.setHeader("Retry-After", String(rateCheck.retryAfterSeconds));
      res.setHeader("Content-Type", "application/json");
      const waitMinutes = Math.ceil(rateCheck.retryAfterSeconds / 60);
      res.end(
        JSON.stringify({
          error: `Rate limit reached (${rateCheck.limit} generations per ${Math.round(rateLimiter.config.windowMs / 60000)} minutes). Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before trying again.`,
          retryAfter: rateCheck.retryAfterSeconds,
          limit: rateCheck.limit,
          remaining: 0,
          resetTime: rateCheck.resetTime,
        }),
      );
      return;
    }

    readBody(req, MAX_MEDIA_BODY_BYTES).then(
      async (body) => {
        try {
          const sessionId = getSessionIdFromRequest(req);
          const sessionPaths = resolveWorkspacePaths(api, sessionId);

          const {
            sceneId,
            device = "iphone-6.9",
            locale = "en-US",
            tone,
            customPrompt,
            appContext,
            imageBase64: directImageBase64,
          } = JSON.parse(body || "{}") as {
            sceneId?: string;
            device?: string;
            locale?: string;
            tone?: string;
            customPrompt?: string;
            appContext?: {
              name?: string;
              category?: string;
              description?: string;
            };
            imageBase64?: string;
          };

          if (!sceneId) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "sceneId is required" }));
            return;
          }

          if (customPrompt && customPrompt.length > 300) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "customPrompt exceeds maximum allowed length of 300 characters",
              }),
            );
            return;
          }

          const apiKey = getGeminiApiKey(sessionPaths) || getGeminiApiKey(api.paths);
          if (!apiKey) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error:
                  "GEMINI_API_KEY is not configured. Please ensure GEMINI_API_KEY=your_key is in the .env file.",
              }),
            );
            return;
          }

          let imageBase64 = "";
          let mimeType = "image/jpeg";

          if (directImageBase64) {
            const rawBase64 = directImageBase64.replace(/^data:image\/[a-z0-9]+;base64,/, "");
            const buf = Buffer.from(rawBase64, "base64");
            const optimized = await optimizeScreenshotForAi(buf, 640);
            imageBase64 = optimized.base64;
            mimeType = optimized.mimeType;
          } else {
            const cleanSceneId = sceneId.split("#")[0];
            const cleanBaseSceneId = cleanSceneId.replace(/-\d+$/, "");
            const candidateNames = Array.from(
              new Set([sceneId, cleanSceneId, cleanBaseSceneId].filter(Boolean)),
            );

            const devicesToTry = Array.from(
              new Set([device, "iphone-6.9", "pixel-10-pro", "ipad-13"].filter(Boolean)),
            );

            const outDirsToTry = Array.from(
              new Set(
                [
                  sessionPaths.outDir,
                  sessionPaths.webDir,
                  api.paths.outDir,
                  api.paths.webDir,
                ].filter(Boolean),
              ),
            );

            let screenshotPath: string | null = null;

            for (const outDir of outDirsToTry) {
              for (const dev of devicesToTry) {
                for (const name of candidateNames) {
                  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
                    const p = join(outDir, "raw", dev, `${name}${ext}`);
                    if (existsSync(p)) {
                      screenshotPath = p;
                      break;
                    }
                  }
                  if (screenshotPath) break;
                }
                if (screenshotPath) break;
              }
              if (screenshotPath) break;

              for (const dev of devicesToTry) {
                const screenshotsDir = join(outDir, "screenshots", dev, locale);
                if (existsSync(screenshotsDir)) {
                  const files = await readdir(screenshotsDir);
                  for (const name of candidateNames) {
                    const matched = findScreenshotFile(files, name);
                    if (matched) {
                      screenshotPath = join(screenshotsDir, matched);
                      break;
                    }
                  }
                }
                if (screenshotPath) break;
              }
              if (screenshotPath) break;

              for (const dev of devicesToTry) {
                const rawDir = join(outDir, "raw", dev);
                if (existsSync(rawDir)) {
                  const files = await readdir(rawDir);
                  for (const name of candidateNames) {
                    const matched = files.find(
                      (f) =>
                        f.toLowerCase().includes(name.toLowerCase()) &&
                        (f.endsWith(".png") ||
                          f.endsWith(".jpg") ||
                          f.endsWith(".jpeg") ||
                          f.endsWith(".webp")),
                    );
                    if (matched) {
                      screenshotPath = join(rawDir, matched);
                      break;
                    }
                  }
                }
                if (screenshotPath) break;
              }
              if (screenshotPath) break;

              if (existsSync(outDir)) {
                try {
                  const files = await readdir(outDir);
                  for (const name of candidateNames) {
                    const matched = files.find(
                      (f) =>
                        f.toLowerCase().includes(name.toLowerCase()) &&
                        (f.endsWith(".png") ||
                          f.endsWith(".jpg") ||
                          f.endsWith(".jpeg") ||
                          f.endsWith(".webp")),
                    );
                    if (matched) {
                      screenshotPath = join(outDir, matched);
                      break;
                    }
                  }
                } catch {}
              }
              if (screenshotPath) break;
            }

            if (!screenshotPath || !existsSync(screenshotPath)) {
              res.statusCode = 404;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: `Screenshot file for scene "${sceneId}" not found in out/raw or out/screenshots.`,
                }),
              );
              return;
            }

            const imageBuffer = await readFile(screenshotPath);
            const optimized = await optimizeScreenshotForAi(imageBuffer, 640);
            imageBase64 = optimized.base64;
            mimeType = optimized.mimeType;
          }

          const appName = appContext?.name ? `App: "${appContext.name}"` : "";
          const appCat = appContext?.category ? `Category: ${appContext.category}` : "";
          const appDesc = appContext?.description
            ? `Summary: ${appContext.description.slice(0, 160)}`
            : "";
          const customGuide = customPrompt ? `Direction: "${customPrompt}"` : "";
          const toneInstruction =
            tone && tone !== "all"
              ? `Target Tone: ${tone}. Return 3 options in this style.`
              : "Provide 3 options with diverse marketing angles (Punchy, Benefit-Driven, Action-Oriented).";

          const contextInfo = [appName, appCat, appDesc, customGuide, toneInstruction]
            .filter(Boolean)
            .join(" | ");

          const promptText = `Analyze this mobile UI screenshot as an elite App Store copywriter.
Target Language/Locale: ${locale}
Reference App Context (may be fallback or generic): ${contextInfo || "None"}

CRITICAL RULES:
1. PRIMARY FOCUS: Inspect the visible UI in this screenshot first. Identify the actual app name, domain (e.g. VPN, Privacy & Security, Utility, Finance, Social, Health), features, status, buttons, and metrics shown on screen.
2. If the screenshot clearly depicts a different app than the reference context, ALWAYS base your copy 100% on what is visually shown in the screenshot. Do NOT force copy about an unrelated app or category.
3. Headline: punchy, compelling marketing copy under 30 characters highlighting this screen's core benefit.
4. Subhead: clear, benefit-driven explanation under 80 characters.
5. Return exactly 3 options in valid JSON:
{
  "screenAnalysis": "1-sentence summary of visible UI",
  "suggestions": [
    {
      "tone": "Punchy" | "Benefit-Driven" | "Action-Oriented" | "Minimalist",
      "headline": "...",
      "subhead": "..."
    }
  ]
}`;

          const candidateModels = [
            "gemini-3.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3.5-flash",
            "gemini-3.6-flash",
          ];
          let rawContent: string | null = null;
          let lastError: string | null = null;

          for (const model of candidateModels) {
            try {
              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [
                      {
                        parts: [
                          { text: promptText },
                          {
                            inlineData: {
                              mimeType,
                              data: imageBase64,
                            },
                          },
                        ],
                      },
                    ],
                    generationConfig: {
                      responseMimeType: "application/json",
                      maxOutputTokens: 600,
                      temperature: 0.7,
                    },
                  }),
                },
              );

              if (geminiRes.ok) {
                const data = (await geminiRes.json()) as any;
                rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawContent) break;
              } else {
                lastError = await geminiRes.text().catch(() => "");
              }
            } catch (e) {
              lastError = e instanceof Error ? e.message : String(e);
            }
          }

          if (!rawContent) {
            let readableError = lastError || "Failed to generate copy from Gemini API.";
            try {
              const parsedErr = JSON.parse(readableError);
              if (parsedErr?.error?.message) {
                readableError = parsedErr.error.message;
              }
            } catch {}
            throw new Error(`Gemini API: ${readableError}`);
          }

          let parsed: any;
          try {
            parsed = JSON.parse(rawContent);
          } catch {
            const cleaned = rawContent.replace(/```(?:json)?\n?|\n?```/g, "").trim();
            parsed = JSON.parse(cleaned);
          }

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: true,
              sceneId,
              screenAnalysis: parsed.screenAnalysis || "UI Screen analysis completed.",
              suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
              rateLimit: {
                limit: rateCheck.limit,
                remaining: rateCheck.remaining,
                resetTime: rateCheck.resetTime,
              },
            }),
          );
        } catch (err) {
          console.error("AI Copy generation error in aiCopyHandler:", err);
          sendRequestError(res, err, true);
        }
      },
      (err) => sendRequestError(res, err, true),
    );
  };
}
