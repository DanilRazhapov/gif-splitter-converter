import type { FastifyInstance, FastifyRequest } from "fastify";
import { mp4ToGif } from "../services/mp4ToGif.js";
import { splitGif } from "../services/gifSplitter.js";

async function readForm(request: FastifyRequest) {
    let fileBuffer: Buffer | undefined;
    const fields: Record<string, string> = {};

    for await (const part of request.parts()) {
        if (part.type === "file") {
            const buffer = await part.toBuffer();

            if (part.fieldname === "file") {
                fileBuffer = buffer;
            }
        } else {
            fields[part.fieldname] = String(part.value);
        }
    }

    if (!fileBuffer) {
        throw new Error("MP4-файл не был передан");
    }

    const startTime = Number(fields.startTime ?? 0);
    const duration = Number(fields.duration ?? 5);

    let options = {};

    if (fields.options) {
        options = JSON.parse(fields.options);
    }

    return { fileBuffer, startTime, duration, options };
}

function asArrayBuffer(buffer: Buffer): ArrayBuffer {
    return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;
}

export async function convertRoutes(app: FastifyInstance) {
    app.post("/api/convert", async (request, reply) => {
        const { fileBuffer, startTime, duration, options } = 
            await readForm(request);

        const gifBuffer = await mp4ToGif(
            fileBuffer,
            startTime,
            duration,
            options
        );

        return reply
            .type("image/gif")
            .header(
                "content-disposition",
                'attachment; filename="converted.gif'
            )
            .send(gifBuffer)
    });

    app.post("/ api/convert-and-split", async (request, reply) => {
        const { fileBuffer, startTime, duration, options } = 
            await readForm(request);

        const gifBuffer = await mp4ToGif(
            fileBuffer,
            startTime,
            duration,
            options
        );

        const zipBuffer = await splitGif(asArrayBuffer(gifBuffer))

        return reply
            .type("application/zip")
            .header(
                "content-disposition",
                'attachment; filename="gif-parts.zip'
            )
            .send(zipBuffer)
    })
}