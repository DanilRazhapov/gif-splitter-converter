import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

let isLoaded: boolean = false

async function ensureLoaded() {
    if (isLoaded) return;

    const baseUrl = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
    
    await ffmpeg.load({
            coreURL: await toBlobURL(`${baseUrl}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, 'application/wasm'),
        });
    isLoaded = true
}

export async function mp4ToGif (
    file: File, 
    startTime: number, 
    duration: number, 
    options: {
        fps?: number,
        width?: number,
        dither?: 'none' | 'bayer' | 'floyd_steinberg' | 'sierra2_4a',
        statsMode?: 'full' | 'diff' | 'single',
        maxColors?: number,
        diffMode?: 'none' | 'rectangle',
        bayerScale?: number,
        } = {}
    ): Promise<Blob> {

    await ensureLoaded()

    const {
        fps = 15,
        width = 720,
        dither = 'sierra2_4a',
        statsMode = 'diff',
        maxColors = 256,
        diffMode = 'none',
        bayerScale = 2,
    } = options;

    await ffmpeg.writeFile('input.mp4', await fetchFile(file));

    const ditherParam = dither === 'bayer' ? `dither=bayer:bayer_scale=${bayerScale}` : `dither=${dither}`;

    const filter = [
        `fps=${fps}`,
        `scale=${width}:-1:flags=lanczos`,
        `split[s0][s1]`,
        `[s0]palettegen=max_colors=${maxColors}:stats_mode=${statsMode}[p]`,
        `[s1][p]paletteuse=${ditherParam}:diff_mode=${diffMode}`,
    ].join(',');

    await ffmpeg.exec([
        '-ss', String(startTime),
        '-i', 'input.mp4', 
        '-t', String(duration),
        '-vf', filter,
        '-loop', '0',
        'output.gif'])

    const data = await ffmpeg.readFile('output.gif')

    if (typeof data === 'string') {
    throw new Error('FFmpeg returned string instead of binary data');
}

    return new Blob([new Uint8Array(data as Uint8Array)], { type: 'image/gif'})
}