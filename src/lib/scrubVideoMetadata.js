let ffmpeg = null;
let loadingPromise = null;

async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  if (!loadingPromise) {
    loadingPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile } = await import("@ffmpeg/util");

      const instance = new FFmpeg();

      await instance.load({
        coreURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js",
        wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm",
      });

      // stash helpers on instance so we don’t re-import every call
      instance._fetchFile = fetchFile;

      return instance;
    })();
  }

  ffmpeg = await loadingPromise;
  return ffmpeg;
}

export async function scrubVideoMetadata(file) {
  if (!file) return file;

  const ext = file.name.toLowerCase().split(".").pop();

  // Only scrub risky formats
  if (!["mov", "mp4"].includes(ext)) {
    return file;
  }

  // Safety guard for very large files
  const MAX_SIZE_MB = 1500;
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB > MAX_SIZE_MB) {
    console.warn("⚠️ File too large for client scrub, skipping metadata cleanup");
    return file;
  }

  try {
    const ffmpegInstance = await loadFFmpeg();
    const fetchFile = ffmpegInstance._fetchFile;

    const inputName = `input.${ext}`;
    const outputName = `output.${ext}`;

    // Write file into wasm FS
    await ffmpegInstance.writeFile(inputName, await fetchFile(file));

    // 🔥 Strip ALL metadata, no re-encode
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

    // Cleanup FS
    try {
      await ffmpegInstance.deleteFile(inputName);
      await ffmpegInstance.deleteFile(outputName);
    } catch (_) {}

    return new File([data.buffer], file.name, { type: file.type });
  } catch (err) {
    console.error("❌ Metadata scrub failed:", err);

    // Fail open — never block uploads in prod
    return file;
  }
}
