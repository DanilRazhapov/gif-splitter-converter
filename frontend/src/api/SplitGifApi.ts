import downloadBlob from "../components/download";

export async function handleSplitGif(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://127.0.0.1:3000/api/split", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Не удалось обработать GIF");
  }

  const zipBlob = await response.blob();

  downloadBlob(zipBlob, "gif-parts.zip");
}