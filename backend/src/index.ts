import Fastify from "fastify"
import cors from "@fastify/cors"
import multipart from "@fastify/multipart"
import { splitRoute } from "./routes/splitRoute.js";
import { convertRoutes } from "./routes/convertRoutes.js";

const app = Fastify({
    logger: true,
});

await app.register(cors, {
    origin: "http://localhost:5173",
});

await app.register(multipart, {
    limits: {
        fileSize: 100 * 1024 * 1024,
        files: 1
    }
});

await app.register(splitRoute)
await app.register(convertRoutes)

app.get("/api/health", async () => {
    return {
        status: "ok",
    };
});

try {
    await app.listen({
        port: 3000,
        host: "127.0.0.1",
    });
} catch (error) {
    app.log.error(error);
    process.exit(1);
}