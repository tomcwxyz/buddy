export type PreparedUploadImage = {
  fileName: string;
  previewImage: string;
  ocrImage: string;
  width: number;
  height: number;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("file_read_failed"));
    reader.onerror = () => reject(reader.error ?? new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image_load_failed"));
    image.src = src;
  });
}

/**
 * Prepare an uploaded/captured photograph for Buddy's browser OCR.
 * The source image stays in the browser; callers decide whether to retain the
 * derived data URLs in component state.
 */
export async function prepareUploadedImage(
  file: File,
  maxWidth = 2000,
): Promise<PreparedUploadImage> {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("canvas_unavailable");

  context.drawImage(image, 0, 0, width, height);
  const previewImage = canvas.toDataURL("image/jpeg", 0.94);
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const grey = Math.round(
      pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114,
    );
    const contrasted = Math.max(0, Math.min(255, Math.round((grey - 128) * 1.42 + 136)));
    pixels[index] = contrasted;
    pixels[index + 1] = contrasted;
    pixels[index + 2] = contrasted;
  }

  context.putImageData(imageData, 0, 0);

  return {
    fileName: file.name,
    previewImage,
    ocrImage: canvas.toDataURL("image/png"),
    width,
    height,
  };
}
