import Fastify from "fastify"
import cors from "@fastify/cors"
import multipart from "@fastify/multipart"
import { splitRoute } from "./routes/splitRoute.js";
import { convertRoutes } from "./routes/convertRoutes.js";

const app = Fastify({
    logger: true,
});

const allowedOrigins = [
    "http://localhost:5173",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
]

await app.register(cors, {
    origin: allowedOrigins,
});

await app.register(multipart, {
    limits: {
        fileSize: 25 * 1024 * 1024,
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
        port: Number(process.env.PORT) || 3000,
        host: "0.0.0.0",
    });
} catch (error) {
    app.log.error(error);
    process.exit(1);
}