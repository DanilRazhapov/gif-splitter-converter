import { API_URL } from "./config";

type ConvertOptions = {
    fps?: number;
    width?: number;
    dither?: "none" | "bayer" | "floyd_steinberg" | "sierra2_4a";
    statsMode?: "full" | "diff" | "single";
    maxColors?: number;
    diffMode?: "none" | "rectangle";
    bayerScale?: number;
};

async function requestConversion(
    endpoint: "/api/convert" | "/api/convert-and-split",
    file: File,
    startTime: number,
    duration: number,
    options: ConvertOptions
): Promise<Blob> {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("startTime", String(startTime));
    formData.append("duration", String(duration));
    formData.append("options", JSON.stringify(options));

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Не удалось обработать видео");
    }

    return response.blob()
}

export function convertAndDownload(
    file: File,
    startTime: number,
    duration: number,
    options: ConvertOptions
) {
    return requestConversion(
        "/api/convert",
        file,
        startTime,
        duration,
        options
    );
}

export function convertAndSplit(
    file: File,
    startTime: number,
    duration: number,
    options: ConvertOptions
) {
    return requestConversion(
        "/api/convert-and-split",
        file,
        startTime,
        duration,
        options
    );
}