import type { FastifyInstance } from "fastify";
import { splitGif } from "../services/gifSplitter.js";

export async function splitRoute(app: FastifyInstance) {
    app.post("/api/split", async (request, reply) => {
        const file = await request.file()

        if (!file) {
            return reply.code(400).send({
                message: "Gif-файл не был передан",
            });
        }

        const inputBuffer = await file.toBuffer();

        const gif = inputBuffer.buffer.slice(
            inputBuffer.byteOffset,
            inputBuffer.byteOffset + inputBuffer.byteLength
        ) as ArrayBuffer;

        const zipBuffer = await splitGif(gif);

        return reply
            .type("application/zip")
            .header(
                "content-disposition",
                'attachment; filename="gif-parts.zip"'
            )
            .send(zipBuffer);
    });
}