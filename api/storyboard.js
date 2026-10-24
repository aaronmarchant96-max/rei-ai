import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const router = express.Router();

// 1. Configurable Production Root (.env, env var, or relative candidate search)
const candidateRoots = [
  process.env.THULAN_PRODUCTION_ROOT,
  path.resolve(process.cwd(), "../../animation/thulans-production"),
  path.resolve(process.cwd(), "../animation/thulans-production"),
  path.join(os.homedir(), "animation/thulans-production")
];
const PRODUCTION_ROOT = candidateRoots.find(p => p && fs.existsSync(p)) || "/home/aaron/animation/thulans-production";
const DEFAULT_EPISODE = process.env.THULAN_DEFAULT_EPISODE || "001_eleven_bells";

function getEpisodeDir(episodeId = DEFAULT_EPISODE) {
  return path.join(PRODUCTION_ROOT, "episodes", path.basename(episodeId));
}

function getStoryboardDir(episodeId = DEFAULT_EPISODE) {
  return path.join(getEpisodeDir(episodeId), "storyboard");
}

const DRAFTS_DIR = path.join(PRODUCTION_ROOT, "tools/panel-studio/drafts");
const COMPOSITOR_SCRIPT = path.join(PRODUCTION_ROOT, "tools/panel-studio/lib/composite_panel.py");
const ANIMATIC_SCRIPT = path.join(PRODUCTION_ROOT, "tools/export_animatic.py");

if (!fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

// Single-job lock for animatic compilation
let activeAnimaticJob = null;

function resolveSafePath(root, rel) {
  if (!rel) return null;
  const safeFilename = path.basename(rel);
  const abs = path.resolve(root, safeFilename);
  if (!abs.startsWith(root) || !fs.existsSync(abs)) {
    return null;
  }
  return abs;
}

function resolveRef(p) {
  if (!p) return null;
  const abs = path.resolve(p);
  if (!abs.startsWith(PRODUCTION_ROOT) || !fs.existsSync(abs)) {
    throw new Error(`Invalid reference image outside production root: ${p}`);
  }
  return abs;
}

// 2. Decoupled Dynamic Episode & Beat Catalog
function loadEpisodeData(episodeId = DEFAULT_EPISODE) {
  const epDir = getEpisodeDir(episodeId);
  const beatsFile = path.join(epDir, "storyboard_beats.json");
  if (fs.existsSync(beatsFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(beatsFile, "utf-8"));
      return parsed;
    } catch (err) {
      console.error(`Error parsing ${beatsFile}:`, err);
    }
  }
  return null;
}

// GET episodes list
router.get("/episodes", (req, res) => {
  try {
    const episodesDir = path.join(PRODUCTION_ROOT, "episodes");
    if (!fs.existsSync(episodesDir)) return res.json([]);
    const entries = fs.readdirSync(episodesDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith("."))
      .map(d => {
        const epData = loadEpisodeData(d.name);
        return {
          id: d.name,
          title: epData?.title || d.name,
          hasBeats: Boolean(epData?.beats)
        };
      });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET beats for an episode
router.get("/beats", (req, res) => {
  const episodeId = req.query.episode || DEFAULT_EPISODE;
  const epData = loadEpisodeData(episodeId);
  if (epData && Array.isArray(epData.beats)) {
    return res.json(epData.beats);
  }
  res.status(404).json({ error: `No storyboard beats found for episode: ${episodeId}` });
});

// GET canon plates
router.get("/canon", (req, res) => {
  const episodeId = req.query.episode || DEFAULT_EPISODE;
  const epData = loadEpisodeData(episodeId);
  const sbDir = getStoryboardDir(episodeId);

  if (epData && Array.isArray(epData.canon_plates)) {
    const enriched = epData.canon_plates.map(cp => ({
      ...cp,
      url: `/api/storyboard/plate/${encodeURIComponent(cp.filename)}?episode=${encodeURIComponent(episodeId)}`,
      absPath: path.join(sbDir, cp.filename)
    }));
    return res.json(enriched);
  }
  res.json([]);
});

// GET storyboard plates list
router.get("/plates", (req, res) => {
  try {
    const episodeId = req.query.episode || DEFAULT_EPISODE;
    const sbDir = getStoryboardDir(episodeId);
    if (!fs.existsSync(sbDir)) return res.json([]);

    const files = fs.readdirSync(sbDir)
      .filter(f => f.endsWith(".jpg") || f.endsWith(".png"))
      .map(f => ({
        filename: f,
        url: `/api/storyboard/plate/${encodeURIComponent(f)}?episode=${encodeURIComponent(episodeId)}`
      }));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET plate image
router.get("/plate/:filename", (req, res) => {
  const episodeId = req.query.episode || DEFAULT_EPISODE;
  const sbDir = getStoryboardDir(episodeId);
  const safe = resolveSafePath(sbDir, req.params.filename);
  if (!safe) return res.status(404).send("Plate not found");
  res.sendFile(safe);
});

// GET drafts list
router.get("/drafts", (req, res) => {
  try {
    if (!fs.existsSync(DRAFTS_DIR)) return res.json([]);
    const files = fs.readdirSync(DRAFTS_DIR)
      .filter(f => f.endsWith(".jpg") || f.endsWith(".png"))
      .map(f => {
        const stat = fs.statSync(path.join(DRAFTS_DIR, f));
        return {
          filename: f,
          url: `/api/storyboard/draft/${encodeURIComponent(f)}`,
          createdAt: stat.mtimeMs
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json(files);
  } catch {
    res.json([]);
  }
});

// GET draft image
router.get("/draft/:filename", (req, res) => {
  const safe = resolveSafePath(DRAFTS_DIR, req.params.filename);
  if (!safe) return res.status(404).send("Draft not found");
  res.sendFile(safe);
});

// 3. Robust Multi-Layer Image Generation (Receipt File + ANSI Scrub + Timestamp Fallback)
router.post("/generate", async (req, res) => {
  const startTime = Date.now();
  const safeTmp = (fs.existsSync(os.tmpdir())) ? os.tmpdir() : "/tmp";
  const receiptFile = path.join(safeTmp, `storyboard_rcpt_${startTime}_${Math.random().toString(36).slice(2, 8)}.txt`);

  try {
    const { prompt, negativePrompt, referenceImage, beatId } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    let ref = null;
    if (referenceImage) {
      ref = resolveRef(referenceImage);
    }

    const fullPrompt = negativePrompt ? `${prompt}. Absolutely NO: ${negativePrompt}.` : prompt;
    const cleanPrompt = fullPrompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const refClause = ref ? ` Also pass ImagePaths ["${ref}"] and use it as the character and ink-style reference.` : "";
    
    // Command instructs AGY to write exact path to deterministic receiptFile
    const agyCommand = `Use your generate_image tool with ImageName "thulan_panel", AspectRatio "16:9", and Prompt "${cleanPrompt}".${refClause} Then write the absolute path of the generated image to "${receiptFile}". Print ONLY the path on the last line.`;

    const proc = spawn("agy", ["--dangerously-skip-permissions", "-p", agyCommand], {
      timeout: 180_000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", d => stdout += d.toString());
    proc.stderr.on("data", d => stderr += d.toString());

    proc.on("error", (err) => {
      console.error("AGY spawn error:", err);
      if (!res.headersSent) res.status(500).json({ error: `AGY process error: ${err.message}` });
    });

    proc.on("close", (code) => {
      if (res.headersSent) return;

      let generatedPath = null;

      // Layer 1: Check deterministic receipt file
      if (fs.existsSync(receiptFile)) {
        try {
          const content = fs.readFileSync(receiptFile, "utf-8").trim();
          if (content && fs.existsSync(content)) {
            generatedPath = content;
          }
        } catch (_) {}
      }

      // Layer 2: Sanitized ANSI-stripped stdout regex
      if (!generatedPath) {
        const cleanStdout = stdout.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");
        const matches = cleanStdout.match(/\/home\/[^\s\n"']+\.(?:jpg|jpeg|png)/g);
        if (matches && matches.length > 0) {
          const candidate = matches[matches.length - 1];
          if (fs.existsSync(candidate)) {
            generatedPath = candidate;
          }
        }
      }

      // Layer 3: Recent artifact scan in AGY brain directory
      if (!generatedPath) {
        const agyBrainRoot = path.join(os.homedir(), ".gemini/antigravity-cli/brain");
        if (fs.existsSync(agyBrainRoot)) {
          try {
            const dirs = fs.readdirSync(agyBrainRoot)
              .map(d => path.join(agyBrainRoot, d))
              .filter(p => fs.statSync(p).isDirectory())
              .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

            for (const d of dirs.slice(0, 3)) {
              const files = fs.readdirSync(d)
                .filter(f => f.startsWith("thulan_panel") && (f.endsWith(".jpg") || f.endsWith(".png")))
                .map(f => path.join(d, f))
                .filter(p => fs.statSync(p).mtimeMs >= startTime - 1000)
                .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

              if (files.length > 0) {
                generatedPath = files[0];
                break;
              }
            }
          } catch (_) {}
        }
      }

      // Cleanup receipt file
      try {
        if (fs.existsSync(receiptFile)) fs.unlinkSync(receiptFile);
      } catch (_) {}

      if (!generatedPath || !fs.existsSync(generatedPath)) {
        return res.status(500).json({
          error: code !== 0 ? `AGY failed (code ${code}): ${stderr || stdout}` : `Could not resolve generated image file from AGY run. Output: ${stdout}`
        });
      }

      const buffer = fs.readFileSync(generatedPath);
      const b64 = buffer.toString("base64");
      const mime = generatedPath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

      // Save into drafts
      const draftFilename = `draft_${Date.now()}_beat_${beatId || 1}.jpg`;
      const draftTarget = path.join(DRAFTS_DIR, draftFilename);
      fs.writeFileSync(draftTarget, buffer);

      res.json({
        imageBase64: `data:${mime};base64,${b64}`,
        localPath: generatedPath,
        draftUrl: `/api/storyboard/draft/${encodeURIComponent(draftFilename)}`,
        draftFilename
      });
    });
  } catch (err) {
    try {
      if (fs.existsSync(receiptFile)) fs.unlinkSync(receiptFile);
    } catch (_) {}
    console.error("Generate error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST export (Composite plate)
router.post("/export", (req, res) => {
  try {
    const { imageBase64, title, sector, quote, filename, episodeId = DEFAULT_EPISODE } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "Missing imageBase64" });

    const rawB64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const tempIn = path.join(PRODUCTION_ROOT, "tools/panel-studio/temp_export_in.png");
    fs.writeFileSync(tempIn, Buffer.from(rawB64, "base64"));

    const sbDir = getStoryboardDir(episodeId);
    if (!fs.existsSync(sbDir)) fs.mkdirSync(sbDir, { recursive: true });

    const safeFilename = path.basename(filename || `panel_${Date.now()}.jpg`);
    const outPath = path.join(sbDir, safeFilename);

    const py = spawn("python3", [
      COMPOSITOR_SCRIPT,
      tempIn,
      outPath,
      title || "THE THULANS",
      sector || "SECTOR-6A112",
      quote || ""
    ]);

    let pyErr = "";
    py.stderr.on("data", d => pyErr += d.toString());

    py.on("close", (code) => {
      if (code === 0) {
        res.json({ success: true, filename: safeFilename, url: `/api/storyboard/plate/${safeFilename}?episode=${encodeURIComponent(episodeId)}` });
      } else {
        res.status(500).json({ error: `Compositor failed (code ${code}): ${pyErr}` });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST trigger animatic compilation (with Mutex lock)
router.post("/animatic/compile", (req, res) => {
  if (activeAnimaticJob && activeAnimaticJob.status === "running") {
    return res.status(409).json({ error: "Animatic compilation is already running", status: activeAnimaticJob.status });
  }

  const episodeId = req.body?.episodeId || DEFAULT_EPISODE;
  const outVideo = path.join(getEpisodeDir(episodeId), "eleven_bells_animatic.mp4");

  activeAnimaticJob = {
    startedAt: Date.now(),
    status: "running",
    progressLog: "Starting 24fps animatic compilation...",
    output: outVideo
  };

  const py = spawn("python3", [ANIMATIC_SCRIPT], {
    cwd: PRODUCTION_ROOT,
    env: { ...process.env, THULAN_PRODUCTION_ROOT: PRODUCTION_ROOT }
  });

  py.stdout.on("data", (d) => {
    activeAnimaticJob.progressLog = d.toString().trim();
  });

  py.stderr.on("data", (d) => {
    activeAnimaticJob.progressLog = d.toString().trim();
  });

  py.on("close", (code) => {
    if (code === 0) {
      activeAnimaticJob.status = "completed";
      activeAnimaticJob.finishedAt = Date.now();
    } else {
      activeAnimaticJob.status = "failed";
      activeAnimaticJob.error = `Exited with code ${code}`;
    }
  });

  res.json({ success: true, message: "Animatic compilation started" });
});

// GET animatic status
router.get("/animatic/status", (req, res) => {
  const episodeId = req.query.episode || DEFAULT_EPISODE;
  const outVideo = path.join(getEpisodeDir(episodeId), "eleven_bells_animatic.mp4");
  const exists = fs.existsSync(outVideo);
  const size = exists ? fs.statSync(outVideo).size : 0;

  res.json({
    activeJob: activeAnimaticJob,
    videoExists: exists,
    videoSize: size,
    videoPath: outVideo
  });
});

export default router;
