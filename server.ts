import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API middleware
  app.use(express.json());

  // Cache to avoid duplicate Google Cloud TTS requests for the exact same text and settings
  const ttsCache = new Map<string, string>();

  // API Route: Synthesize Speech using Google Cloud Text-to-Speech API
  app.post("/api/tts", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          fallback: true,
          error: "GOOGLE_CLOUD_API_KEY is not defined on the server. Falling back to local offline TTS." 
        });
      }

      const { text, lang, speaker, speed } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text parameter is required" });
      }

      // Create a cache key from params to avoid charging client/billing repeatedly
      const cacheKey = `${text}_${lang || 'en-US'}_${speaker || 'A'}_${speed || '1.15'}`;
      if (ttsCache.has(cacheKey)) {
        console.log(`[TTS] Cache Hit for: "${text.substring(0, 20)}..."`);
        return res.json({ audioContent: ttsCache.get(cacheKey) });
      }

      // Map Speaker types to high-quality authentic Neural2 Voices
      let voiceName = "en-US-Neural2-F"; // Standard Female US English
      const targetLang = lang || "en-US";

      if (targetLang.toLowerCase().includes("ko")) {
        // High fidelity Korean Neural2
        voiceName = speaker === "B" ? "ko-KR-Neural2-C" : "ko-KR-Neural2-A"; // Male C vs. Female A
      } else {
        // Premium English (US) Neural2
        voiceName = speaker === "B" ? "en-US-Neural2-J" : "en-US-Neural2-F"; // Male J vs. Female F
      }

      // Convert speaking rate (Float: 0.25 to 4.0)
      const speakingRate = speed ? parseFloat(speed) : 1.15;

      console.log(`[TTS] Fetching Google Cloud TTS for: "${text.substring(0, 30)}..." Voice: ${voiceName} Speed: ${speakingRate}`);

      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: targetLang,
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: speakingRate,
            pitch: 0.0,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TTS] Google TTS API error (${response.status}):`, errorText);
        return res.status(response.status).json({ 
          fallback: true, 
          error: `Google Cloud TTS API Error: ${response.status}. Falling back to local client voice.` 
        });
      }

      const data = (await response.json()) as { audioContent?: string };
      if (!data.audioContent) {
        return res.status(500).json({ 
          fallback: true, 
          error: "Empty audioContent responded from Google Text-to-Speech API." 
        });
      }

      // Store in memory cache to minimize cost
      ttsCache.set(cacheKey, data.audioContent);

      return res.json({ audioContent: data.audioContent });
    } catch (error: any) {
      console.error("[TTS Proxy Server Error]:", error);
      return res.status(500).json({ 
        fallback: true, 
        error: error.message || "Internal server error connecting to Google Cloud TTS." 
      });
    }
  });

  // Vite integration as middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[SERVER] Vite development middleware applied.");
  } else {
    // Serve static files from compiled dist in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[SERVER] Production static route applied.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Echo Learning Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
