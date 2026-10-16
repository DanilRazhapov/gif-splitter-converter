import downloadBlob from "../components/download";
import { API_URL } from "./config";

export async function handleSplitGif(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/split`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Не удалось обработать GIF");
  }

  const zipBlob = await response.blob();

  downloadBlob(zipBlob, "gif-parts.zip");
}