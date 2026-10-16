import { parseGIF, decompressFrames, type ParsedFrame } from 'gifuct-js'; // библиотека для декодинга GIF
import gifenc from "gifenc"
import JSZip  from 'jszip'; // библиотека для создания zip архива
import sharp from 'sharp';

const { GIFEncoder, quantize, applyPalette } = gifenc

const TARGET_WIDTH: number = 750;
const STRIPE_WIDTH: number = 150;
const STRIPE_COUNT: number = 5

function renderFrame(patch: Uint8ClampedArray, width: number, height: number): Promise<Buffer> { // функция которая рендерит каждый фрейм на канвас и растягивает его до 750px
  return sharp(Buffer.from(patch), {
    raw: {
        width,
        height,
        channels: 4,
    },
  })
    .resize({
        width: TARGET_WIDTH,
        height,
        fit: "fill",
    })
    .raw()
    .toBuffer();
}

function cutFrame(resizedFrame: Buffer, height: number, sx: number): Promise<Buffer> { // функция для разрезания фрейма
  return sharp(resizedFrame, {
    raw: {
        width: TARGET_WIDTH,
        height,
        channels: 4,
    },
  })
   .extract({
    left: sx,
    top: 0,
    width: STRIPE_WIDTH,
    height,
   })
   .raw()
   .toBuffer()
}

async function frameEncoder(frames: Buffer[], delay: number[], width: number, height: number, palette: number[][]): Promise<Uint8Array> { // функция для энкодирования фрейма в GIF
  const encoder = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const indexedPixels = applyPalette(frames[i], palette);

    encoder.writeFrame(indexedPixels, width, height, {
        delay: delay[i],
        palette,
    });
  }

  encoder.finish()

  return encoder.bytes();
}

async function zipGif(encodedFrames: Uint8Array[]): Promise<Buffer> { // функция для создания zip архива из закодированных GIF фреймов
    const zip = new JSZip(); // создание zip архива

    encodedFrames.forEach((frame, index) => {
        zip.file(`frame_${index}.gif`, frame);
    });

    return zip.generateAsync({
        type: "nodebuffer"
    }) // возврат zip архива в виде Blob
}

async function fixFrame(frames: ParsedFrame[], width: number, height: number): Promise<ParsedFrame[]> { // функция для исправления фреймов, чтобы они были одинакового размера
  let frameBuffer = Buffer.alloc(width * height * 4);

  let previousFrame: ParsedFrame | undefined;
  let previousFrameBuffer: Buffer | undefined;

  const result: ParsedFrame[] = [];

  for (const frame of frames) {
    if (previousFrame) {
        const { dims } = previousFrame;

        if (previousFrame.disposalType === 2) {
            for (let y = dims.top; y < dims.top + dims.height; y++) {
                const start = (y * width + dims.left) * 4;
                const end = (y * width + dims.left + dims.width) * 4;

                frameBuffer.fill(0, start, end);
            }
        } else if (
            previousFrame.disposalType === 3 &&
            previousFrameBuffer
        ) {
            frameBuffer = Buffer.from(previousFrameBuffer);
        }
    }

    const frameBufferBeforeFrame = 
        frame.disposalType === 3
            ? Buffer.from(frameBuffer)
            : undefined;

    const { dims } = frame;
    const patch = Buffer.from(frame.patch)

    frameBuffer = await sharp(frameBuffer, {
        raw: { width, height, channels: 4},
    })
        .composite([
            {
                input: patch,
                raw: {
                    width: dims.width,
                    height: dims.height,
                    channels: 4,
                },
                left: dims.left,
                top: dims.top,
                blend: "over",
            },
        ])
        .raw()
        .toBuffer();

    result.push({
        ...frame,
        patch: new Uint8ClampedArray(frameBuffer),
        dims: {
            left: 0,
            top: 0,
            width,
            height,
        },
    });

    previousFrame = frame;
    previousFrameBuffer = frameBufferBeforeFrame;
  }

  return result;
}

export async function splitGif(gif: ArrayBuffer) { // Функция отвечающая за декодинг гифки и рендеринг кадров на канвас
  const gifData = parseGIF(gif);
  const frames = decompressFrames(gifData, true);

  const { width, height } = gifData.lsd;

  if (frames.length === 0) {
    throw new Error("Gif не содержит кадров");
  }

  const fixedFrames = await fixFrame(frames, width, height);

  const framesDelay = fixedFrames.map((frame) => frame.delay);

  const stripesFrames: Buffer[][] = Array.from(
    { length: STRIPE_COUNT },
    () => []
  );

  const frameHeight = fixedFrames[0].dims.height

  for (const frame of fixedFrames) {
    const resizedFrame = await renderFrame(
      frame.patch,
      frame.dims.width,
      frame.dims.height
    );

    for (let k = 0; k < STRIPE_COUNT; k++) {
      const sx = k * STRIPE_WIDTH

      const cuttedFrame = await cutFrame(
        resizedFrame,
        frameHeight,
        sx
      );

      stripesFrames[k].push(cuttedFrame);
    }
  }

  const bigAllPixels = Buffer.concat(stripesFrames.flat());

  const palette = quantize(bigAllPixels, 256);

  const encodedFrames: Uint8Array[] = [];

  for (let i = 0; i < STRIPE_COUNT; i++) {
    const encodedGif = await frameEncoder(
      stripesFrames[i],
      framesDelay,
      STRIPE_WIDTH,
      frameHeight,
      palette
    );

    encodedFrames.push(encodedGif)
  }

  const zipBuffer = await zipGif(encodedFrames);

  return zipBuffer
}