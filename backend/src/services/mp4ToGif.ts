import { spawn } from "node:child_process";
import {
    mkdtemp,
    writeFile,
    readFile,
    rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

type GifOptions = {
    fps?: number;
    width?: number;
    dither?: "none" | "bayer" | "floyd_steinberg" | "sierra2_4a";
    statsMode?: "full" | "diff" | "single";
    maxColors?: number;
    diffMode?: "none" | "rectangle";
    bayerScale?: number;
};

function runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn("ffmpeg", args, {
            windowsHide: true,
            stdio: ["ignore", "ignore", "pipe"],
        });

        let stderr = "";

        child.stderr.setEncoding("utf-8");
        child.stderr.on("data", (chunk: string) => {
            stderr += chunk;
        });

        child.on("error", (error) => {
            reject(error);
        });

        child.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `FFmpeg завершился с кодом ${code}: ${stderr}`
                    )
                );
            }
        });
    });
}

export async function mp4ToGif(
    inputBuffer: Buffer,
    startTime: number,
    duration: number,
    options: GifOptions = {}
): Promise<Buffer> {
    const {
        fps = 20,
        width = 480,
        dither = "bayer",
        statsMode = "diff",
        maxColors = 256,
        diffMode = "rectangle",
        bayerScale = 3,
    } = options;

    if (!Number.isFinite(startTime) || startTime < 0 ||
        !Number.isFinite(duration) || duration <= 0) {
        throw new Error("Некорректное время начала или длительность");
    }

    if (!Number.isInteger(fps) || fps < 1 || fps > 60) {
        throw new Error("FPS должен быть от 1 до 60");
    }

    if (!Number.isInteger(width) || width < 1 || width > 1920) {
        throw new Error("Ширина должна быть от 1 до 1920");
    }

    if (!Number.isInteger(maxColors) || maxColors < 2 || maxColors > 256) {
        throw new Error("Количество цветов должно быть от 2 до 256");
    }

    if (!Number.isInteger(bayerScale) || bayerScale < 0 || bayerScale > 5) {
        throw new Error("Bayer Scale должен быть от 0 до 5");
    }

    const tempDir = await mkdtemp(join(tmpdir(), "gif-convert-"));
    const inputPath = join(tempDir, "input.mp4");
    const outputPath = join(tempDir, "output.gif");

    try {
        let start = performance.now();
        await writeFile(inputPath, inputBuffer);
        console.log("Запись MP4:", (performance.now() - start).toFixed(0), "ms");

        const ditherOption =
            dither === "bayer"
                ? `bayer:bayer_scale=${bayerScale}`
                : dither;

        const filter = [
            `[0:v]fps=${fps},scale=${width}:-1:flags=lanczos,format=rgb24,split[s0][s1]`,
            `[s0]scale=iw/2:-1:flags=bilinear,palettegen=max_colors=${maxColors}:stats_mode=${statsMode}[p]`,
            `[s1][p]paletteuse=dither=${ditherOption}:diff_mode=${diffMode}[out]`,
        ].join(';');

        start = performance.now();

        await runFFmpeg([
            "-hide_banner",
            "-loglevel", "error",
            "-nostdin",
            "-y",
            "-ss", String(startTime),
            "-i", inputPath,
            "-t", String(duration),
            "-filter_complex", filter,
            "-map", "[out]",
            "-an",
            "-loop", "0",
            outputPath,
        ]);

        console.log("Работа FFmpeg:", (performance.now() - start).toFixed(0), "ms");

        start = performance.now();
        const result = await readFile(outputPath);
        console.log("Чтение GIF:", (performance.now() - start).toFixed(0), "ms");

        return result;
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}
