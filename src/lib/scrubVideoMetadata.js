import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpeg = null;
let loadingPromise = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  if (!loadingPromise) {
    ffmpeg = new FFmpeg();

    loadingPromise = ffmpeg.load({
      coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js",
      wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm",
    });
  }

  await loadingPromise;
  return ffmpeg;
}

export async function scrubVideoMetadata(file) {
  if (!file) return file;

  const ext = file.name.toLowerCase().split(".").pop();

  // Only scrub formats that commonly contain GPS / device metadata
  if (!["mov", "mp4"].includes(ext)) {
    return file;
  }

  // Safety: very large files can blow memory in some browsers
  // (optional, but good production guard)
  const MAX_SIZE_MB = 1500; // 1.5 GB safety limit
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB > MAX_SIZE_MB) {
    console.warn("⚠️ File too large for client scrub, skipping metadata cleanup");
    return file;
  }

  const ffmpegInstance = await loadFFmpeg();

  const inputName = `input.${ext}`;
  const outputName = `output.${ext}`;

  try {
    // Write file into FFmpeg virtual FS
    await ffmpegInstance.writeFile(inputName, await fetchFile(file));

    // 🔥 Strip ALL metadata, no re-encode (fast + lossless)
    await ffmpegInstance.exec([
      "-i",
      inputName,
      "-map_metadata",
      "-1",
      "-c",
      "copy",
      outputName,
    ]);

    const data = await ffmpegInstance.readFile(outputName);

    // Cleanup FS (important to prevent memory bloat on multiple uploads)
    try {
      await ffmpegInstance.deleteFile(inputName);
      await ffmpegInstance.deleteFile(outputName);
    } catch (_) {}

    return new File([data.buffer], file.name, { type: file.type });
  } catch (err) {
    console.error("❌ Metadata scrub failed:", err);

    // Always fail open — never block upload
    return file;
  }
}
