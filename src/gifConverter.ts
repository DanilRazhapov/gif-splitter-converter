import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

let isLoaded: boolean = false

async function ensureLoaded() {
    if (isLoaded) return;

    const baseUrl = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';

    await ffmpeg.load({
        coreURL: await toBlobURL(
            `${baseUrl}/ffmpeg-core.js`,
            'text/javascript'
        ),
        wasmURL: await toBlobURL(
            `${baseUrl}/ffmpeg-core.wasm`,
            'application/wasm'
        )
    });

    isLoaded = true
}

export async function mp4ToGif (file: File, startTime: number, duration: number): Promise<Blob> {
    await ensureLoaded()

    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
    await ffmpeg.exec([
        '-ss', String(startTime),
        '-i', 'input.mp4', 
        '-t', String(duration),
        '-vf', 'fps=10,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
        'output.gif'])

    const data = await ffmpeg.readFile('output.gif')

    return new Blob([new Uint8Array(data as Uint8Array)], {
        type: 'image/gif'
    })
}