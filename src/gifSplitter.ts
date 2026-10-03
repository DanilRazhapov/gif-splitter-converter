import { parseGIF, decompressFrames, type ParsedFrame } from 'gifuct-js'; // библиотека для декодинга GIF
import { GIFEncoder, quantize, applyPalette } from 'gifenc' // библиотека для энкодинга фреймов в GIF
import JSZip  from 'jszip'; // библиотека для создания zip архива
import downloadBlob from './components/download';

const TARGET_WIDTH: number = 750;
const STRIPE_WIDTH: number = 150;
const STRIPE_COUNT: number = 5

function renderFrame(patch: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement { // функция которая рендерит каждый фрейм на канвас и растягивает его до 750px
  const canvas = document.createElement('canvas') as HTMLCanvasElement; // исходный канвас
  const sourceCanvas = document.createElement('canvas') as HTMLCanvasElement; // чистый растянутый до 750px холст

  sourceCanvas.width = TARGET_WIDTH; // ширина чистого канваса
  sourceCanvas.height = height; // высота чистого канваса
  const sctx = sourceCanvas.getContext('2d'); // инструмент для чистого канваса

  canvas.width = width; // ширина исходного канваса
  canvas.height = height; // высота исходного канваса
  const ctx = canvas.getContext('2d'); // инструмент для исходного канваса

  if (!ctx) {
    throw new Error('Failed to get canvas context'); // проверка
  }

  if (!sctx) {
    throw new Error('Failed to get source canvas context'); // аналогичная проверка
  }

  const imageData = new ImageData(new Uint8ClampedArray(patch), width, height); // данные о фрейме

  ctx.putImageData(imageData, 0, 0); // размещение фрейма на исходном канвасе

  sctx.drawImage(canvas, 0, 0, width, height, 0, 0, TARGET_WIDTH, height); // растягивание исходного канваса на чистый канвас

  return sourceCanvas; // возврат чистого канваса
}

function cutFrame(resizedCanvas: HTMLCanvasElement, height: number, sx: number): ImageData { // функция для разрезания фрейма
  const oneShotCanvas = document.createElement('canvas') as HTMLCanvasElement // канвас для разрезанного фрейма
  oneShotCanvas.width = STRIPE_WIDTH; // ширина разрезанного фрейма
  oneShotCanvas.height = height; // высота разрезанного фрейма
  const rctx = oneShotCanvas.getContext('2d', { willReadFrequently: true }); // инструмент для разрезанного фрейма

  if (!rctx) {
    throw new Error('Failed to get resized canvas context'); // проверка
  }

  rctx.drawImage(resizedCanvas, sx, 0, STRIPE_WIDTH, height, 0, 0, STRIPE_WIDTH, height); // Разрезание фрейма с исходного канваса на разрезанный канвас

  const imageData = rctx.getImageData(0, 0, STRIPE_WIDTH, height); // получение данных о разрезанном фрейме

  return imageData; // возврат данных о разрезанном фрейме
}

async function frameEncoder(imageData: ImageData[], delay: number[], width: number, height: number, palette: number[][]): Promise<Uint8Array> { // функция для энкодирования фрейма в GIF
  const encoder = GIFEncoder(); // создание энкодера GIF
  for (let i = 0; i < imageData.length; i++) { // цикл по каждому фрейму // создание палитры для каждого фрейма
    const index = applyPalette(imageData[i].data, palette) // применение палитры к каждому фрейму

    encoder.writeFrame(index, width, height, { palette, delay: delay[i] }); // запись каждого фрейма в энкодер
  }
  encoder.finish() // завершение записи фреймов в энкодер

  return encoder.bytes(); // возврат закодированного фрейма в виде массива байтов
}

async function zipGif(encodedFrames: Uint8Array[]): Promise<Blob> { // функция для создания zip архива из закодированных GIF фреймов

  const zip = new JSZip(); // создание zip архива

  for (let i = 0; i < encodedFrames.length; i++) { // цикл по каждому закодированному GIF фрейму
    zip.file(`frame_${i}.gif`, encodedFrames[i]); // добавление каждого закодированного GIF фрейма в zip архив с именем
  }

  const zipBlob = await zip.generateAsync({ type: 'blob'}) // генерация zip архива в виде Blob

  return zipBlob; // возврат zip архива в виде Blob
}

async function fixFrame(frames: ParsedFrame[], width: number, height: number): Promise<ParsedFrame[]> { // функция для исправления фреймов, чтобы они были одинакового размера
  const fixedFrames: ParsedFrame[] = []; // массив для хранения исправленных фреймов с типом ParsedFrame
  const canvas = document.createElement('canvas') as HTMLCanvasElement; // создание канваса для исправления фреймов
  canvas.width = width; // ширина канваса для исправленных фреймов
  canvas.height = height; // высота канваса для исправленных фреймов
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); // инструмент для работы с канвасом для исправленных фреймов

  if (!ctx) {
    throw new Error('Failed to get canvas context'); // проверка
  }

  for (let i = 0; i < frames.length; i++) { // цикл по каждому фрейму
    const miniCanvas = document.createElement('canvas') as HTMLCanvasElement; // создание мини канваса для наложения фреймов друг на друга
    miniCanvas.width = frames[i].dims.width; // ширина мини канваса
    miniCanvas.height = frames[i].dims.height; // высота мини канваса
    const miniCtx = miniCanvas.getContext('2d', { willReadFrequently: true }); // инструмент для работы с мини канвасом

    if (!miniCtx) {
      throw new Error('Failed to get mini canvas context'); // проверка
    }

    const imageData = new ImageData(new Uint8ClampedArray(frames[i].patch), frames[i].dims.width, frames[i].dims.height); //создание ImageData для каждого исправленного фрейма
    miniCtx.putImageData(imageData, 0, 0); // размещение ImageData на мини канвасе
    ctx.drawImage(miniCanvas, frames[i].dims.left, frames[i].dims.top); // наложение мини канваса на канвас для исправленных фреймов c целью добавления его в массив исправленных фреймов

    fixedFrames.push({ 
      ...frames[i],
      patch: ctx.getImageData(0, 0, width, height).data,
      dims: {
        left: 0,
        top: 0,
        width: width,
        height: height
      }
    }); // добавление исправленного фрейма в массив исправленных фреймов 
  }

  return fixedFrames; // возврат массива исправленных фреймов
}

export async function splitGif(gif: File) { // Функция отвечающая за декодинг гифки и рендеринг кадров на канвас
  const buffer = await gif.arrayBuffer();
  const gifData = parseGIF(buffer);
  const frames = decompressFrames(gifData, true);

  const lsd = gifData.lsd; // получение данных о размере GIF

  const fixedFrames = await fixFrame(
    frames, 
    lsd.width, 
    lsd.height
  ); // исправленный массив фреймов где они все одного размера

  const framesDelay: number[] = []

  fixedFrames.forEach((x) => framesDelay.push(x.delay))

  const allPixels: Uint8ClampedArray[][] = [[], [], [], [], []]
  const stripesFrames: ImageData[][] = [[], [], [], [], []]; // массив для хранения разрезанных фреймов
  const encodedFrames: Uint8Array[] = []; // массив для хранения закодированных фреймов

  for (let i = 0; i < fixedFrames.length; i++) { // цикл по каждому исправленному фрейму
    const canvas = renderFrame(fixedFrames[i].patch, fixedFrames[i].dims.width, fixedFrames[i].dims.height) // рендеринг каждого исправленного фрейма на канвас
    let sx = 0; // начальная координата для разрезания фрейма

    for(let k = 0; k < STRIPE_COUNT; k++) { // цикл для разрезания каждого фрейма
      const cuttedFrame = await cutFrame(canvas, canvas.height, sx); // вызов функции разрезающей фрейм
      stripesFrames[k].push(cuttedFrame) // пуш разрезанного фрейма в массив разрезанный фреймов по индексу
      sx += STRIPE_WIDTH // увеличение точки координата для разрезания фрейма
    }

    sx = 0 // обнуление точки координата для разрезания фрейма
  }

  for(let i = 0; i < stripesFrames.length; i++) {
    console.log(stripesFrames)
    for(let k = 0; k < stripesFrames[i].length; k++) {
      allPixels[i].push(stripesFrames[i][k].data)
    }
  }

  let totalLength: number = 0

  for(let i = 0; i < allPixels.length; i++){
    for(let k = 0; k < allPixels[i].length; k++) {
      totalLength += allPixels[i][k].length
    }
  }

  const bigAllPixels = new Uint8ClampedArray(totalLength);
  let offset: number = 0

  for(let i = 0; i < allPixels.length; i++){
    for(let k = 0; k < allPixels[i].length; k++) {
      bigAllPixels.set(allPixels[i][k], offset)
      offset += allPixels[i][k].length
    }
  }

  const palette = quantize(bigAllPixels, 256)

  for (let k = 0; k < STRIPE_COUNT; k++) { // цикл для энкодирования каждой группы разрезанный фреймов
    const result = await frameEncoder(stripesFrames[k], framesDelay, STRIPE_WIDTH, fixedFrames[0].dims.height, palette); // энкодирование групп разрезанных фреймов в GIF
    encodedFrames.push(result); // пуш энкодированных разрезанных фреймов в массив
  }

  const zipBlob = await zipGif(encodedFrames);

  downloadBlob(zipBlob, `frames_${Date.now()}.zip`)
}