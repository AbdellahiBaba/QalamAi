import { spawn } from "child_process";
import { writeFile, unlink, readFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";
import { generateImageBuffer } from "./replit_integrations/image/client";
import { textToSpeech } from "./replit_integrations/audio/client";
import { createCanvas, loadImage } from "canvas";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const activeJobs = new Set<number>();

export function isVideoGenerating(projectId: number): boolean {
  return activeJobs.has(projectId);
}

export function clearVideoLock(projectId: number): void {
  activeJobs.delete(projectId);
}

interface ReelScene {
  sceneNumber: number;
  visualDescription: string;
  spokenText: string;
  textOverlay: string;
  durationSeconds: number;
}

interface VideoResult {
  filePath: string;
  durationSeconds: number;
  sceneCount: number;
}

async function parseScriptIntoScenes(
  scriptContent: string,
  projectTitle: string
): Promise<ReelScene[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a script parser. Extract scenes from an Arabic reel script and return them as structured JSON. Return EXACTLY this format:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "visualDescription": "English description of what the image should show (for AI image generation). Be specific about composition, colors, lighting, style. Must be a visual scene description, NOT text.",
      "spokenText": "Arabic text to be spoken as voiceover for this scene",
      "textOverlay": "Short Arabic text to display on screen (max 10 words)",
      "durationSeconds": 5
    }
  ]
}

Rules:
- Extract exactly 3 scenes from the script
- Visual descriptions must be in ENGLISH and describe a cinematic scene (not text/words)
- Spoken text must be in ARABIC
- Text overlay should be a short key phrase in ARABIC
- Duration should total roughly the target video length
- Each scene should be 3-8 seconds
- If the script doesn't have clear scenes, create logical visual segments from the content`
      },
      {
        role: "user",
        content: `Parse this reel script titled "${projectTitle}" into scenes:\n\n${scriptContent.substring(0, 3000)}`
      }
    ],
  });

  const content = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error("Failed to parse script into scenes");
  }

  return parsed.scenes.map((s: any, i: number) => ({
    sceneNumber: s.sceneNumber || i + 1,
    visualDescription: s.visualDescription || "A cinematic Arabic-themed scene",
    spokenText: s.spokenText || "",
    textOverlay: s.textOverlay || "",
    durationSeconds: Math.min(Math.max(s.durationSeconds || 5, 3), 8),
  }));
}

async function generateSceneImage(
  visualDescription: string,
  sceneNumber: number,
  workDir: string
): Promise<string> {
  const prompt = `Cinematic vertical 9:16 social media reel frame. ${visualDescription}. Professional quality, vibrant colors, high contrast, modern aesthetic. No text or watermarks.`;

  try {
    const buffer = await generateImageBuffer(prompt, "1024x1536");
    const imagePath = join(workDir, `scene_${sceneNumber}.png`);
    await writeFile(imagePath, buffer);
    return imagePath;
  } catch (err) {
    console.error(`[VideoGen] Failed to generate image for scene ${sceneNumber}:`, err);
    const fallbackPath = join(workDir, `scene_${sceneNumber}.png`);
    await createFallbackImage(fallbackPath, sceneNumber);
    return fallbackPath;
  }
}

async function createFallbackImage(outputPath: string, sceneNumber: number): Promise<void> {
  const colors = ["#1B365D", "#2C1810", "#1a1a2e", "#16213e", "#0f3460"];
  const color = colors[(sceneNumber - 1) % colors.length];

  const canvas = createCanvas(1080, 1920);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1080, 1920);
  const pngBuf = canvas.toBuffer("image/png");
  await writeFile(outputPath, pngBuf);
}

async function overlayTextOnImage(
  imagePath: string,
  textOverlay: string,
  workDir: string,
  sceneNumber: number
): Promise<string> {
  if (!textOverlay || !textOverlay.trim()) {
    return imagePath;
  }

  try {
    const img = await loadImage(imagePath);
    const canvas = createCanvas(1080, 1920);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, 1080, 1920);

    const textY = 1920 - 320;
    const gradient = ctx.createLinearGradient(0, textY - 80, 0, 1920);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.4, "rgba(0,0,0,0.6)");
    gradient.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, textY - 80, 1080, 1920 - textY + 80);

    ctx.direction = "rtl";
    ctx.textAlign = "center";
    ctx.font = "bold 52px 'DejaVu Sans', sans-serif";

    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.strokeText(textOverlay, 540, textY, 980);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(textOverlay, 540, textY, 980);

    const outputPath = join(workDir, `scene_text_${sceneNumber}.png`);
    const pngBuf = canvas.toBuffer("image/png");
    await writeFile(outputPath, pngBuf);
    return outputPath;
  } catch (err) {
    console.error(`[VideoGen] Failed to overlay text on scene ${sceneNumber}:`, err);
    return imagePath;
  }
}

async function generateSceneAudio(
  spokenText: string,
  sceneNumber: number,
  workDir: string
): Promise<string | null> {
  if (!spokenText || spokenText.trim().length === 0) {
    return null;
  }

  try {
    const audioBuffer = await textToSpeech(spokenText, "onyx", "mp3");
    if (audioBuffer.length < 100) {
      return null;
    }
    const audioPath = join(workDir, `audio_${sceneNumber}.mp3`);
    await writeFile(audioPath, audioBuffer);
    return audioPath;
  } catch (err) {
    console.error(`[VideoGen] Failed to generate audio for scene ${sceneNumber}:`, err);
    return null;
  }
}

async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      audioPath,
    ]);
    let output = "";
    ffprobe.stdout.on("data", (data) => { output += data.toString(); });
    ffprobe.stderr.on("data", () => {});
    ffprobe.on("close", (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 5 : duration);
      } else {
        resolve(5);
      }
    });
    ffprobe.on("error", () => resolve(5));
  });
}

async function createSceneVideo(
  imagePath: string,
  audioPath: string | null,
  durationSeconds: number,
  sceneNumber: number,
  workDir: string
): Promise<string> {
  const outputPath = join(workDir, `clip_${sceneNumber}.mp4`);

  let actualDuration = durationSeconds;
  if (audioPath) {
    const audioDur = await getAudioDuration(audioPath);
    actualDuration = Math.max(durationSeconds, audioDur + 0.5);
  }

  const args: string[] = [
    "-loop", "1",
    "-i", imagePath,
    "-t", actualDuration.toString(),
  ];

  if (audioPath) {
    args.push("-i", audioPath);
  } else {
    args.push("-f", "lavfi", "-i", `anullsrc=channel_layout=mono:sample_rate=44100`);
  }

  args.push(
    "-filter_complex", "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[out]",
    "-map", "[out]",
    "-map", "1:a",
  );

  if (audioPath) {
    args.push("-shortest");
  } else {
    args.push("-t", actualDuration.toString());
  }

  args.push(
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "96k",
    "-pix_fmt", "yuv420p",
    "-r", "24",
    "-y",
    outputPath,
  );

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => { stderr += data.toString(); });
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg scene video failed (code ${code}): ${stderr.slice(-500)}`));
    });
    ffmpeg.on("error", reject);
  });

  return outputPath;
}

async function concatenateClips(clipPaths: string[], workDir: string): Promise<string> {
  const listPath = join(workDir, "concat_list.txt");
  const outputPath = join(workDir, "final_reel.mp4");

  const listContent = clipPaths.map((p) => `file '${p}'`).join("\n");
  await writeFile(listPath, listContent);

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28",
      "-c:a", "aac",
      "-b:a", "96k",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ]);
    let stderr = "";
    ffmpeg.stderr.on("data", (data) => { stderr += data.toString(); });
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg concat failed (code ${code}): ${stderr.slice(-500)}`));
    });
    ffmpeg.on("error", reject);
  });

  return outputPath;
}

export async function generateReelVideo(
  project: { id: number; title: string },
  scriptContent: string,
): Promise<VideoResult> {
  if (activeJobs.has(project.id)) {
    throw new Error("Video generation already in progress for this project");
  }
  activeJobs.add(project.id);

  const workDir = join(tmpdir(), `reel_${project.id}_${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  try {
    console.log(`[VideoGen] Parsing script for project ${project.id}...`);
    const scenes = await parseScriptIntoScenes(scriptContent, project.title);
    console.log(`[VideoGen] Parsed ${scenes.length} scenes`);

    console.log(`[VideoGen] Generating images and audio...`);
    const sceneAssets = await Promise.all(
      scenes.map(async (scene) => {
        const [imagePath, audioPath] = await Promise.all([
          generateSceneImage(scene.visualDescription, scene.sceneNumber, workDir),
          generateSceneAudio(scene.spokenText, scene.sceneNumber, workDir),
        ]);
        return { scene, imagePath, audioPath };
      })
    );

    console.log(`[VideoGen] Overlaying text on images...`);
    const assetsWithText = await Promise.all(
      sceneAssets.map(async ({ scene, imagePath, audioPath }) => {
        const finalImagePath = await overlayTextOnImage(
          imagePath,
          scene.textOverlay,
          workDir,
          scene.sceneNumber,
        );
        return { scene, imagePath: finalImagePath, audioPath };
      })
    );

    console.log(`[VideoGen] Creating scene clips in parallel...`);
    const clipPaths = await Promise.all(
      assetsWithText.map(({ scene, imagePath, audioPath }) =>
        createSceneVideo(
          imagePath,
          audioPath,
          scene.durationSeconds,
          scene.sceneNumber,
          workDir,
        )
      )
    );

    console.log(`[VideoGen] Concatenating ${clipPaths.length} clips...`);
    const finalPath = await concatenateClips(clipPaths, workDir);

    const videosDir = join(process.cwd(), "generated_videos");
    await mkdir(videosDir, { recursive: true });
    const destFilename = `reel_${randomUUID()}.mp4`;
    const destPath = join(videosDir, destFilename);

    const videoBuffer = await readFile(finalPath);
    await writeFile(destPath, videoBuffer);

    const totalDuration = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

    console.log(`[VideoGen] Video saved to ${destPath} (${totalDuration}s, ${scenes.length} scenes)`);

    return {
      filePath: destPath,
      durationSeconds: totalDuration,
      sceneCount: scenes.length,
    };
  } finally {
    activeJobs.delete(project.id);
    const { readdir } = await import("fs/promises");
    try {
      const files = await readdir(workDir);
      for (const file of files) {
        await unlink(join(workDir, file)).catch(() => {});
      }
      const { rmdir } = await import("fs/promises");
      await rmdir(workDir).catch(() => {});
    } catch {
    }
  }
}
