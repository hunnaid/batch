import type { SquareCrop } from "./profile-crop.ts";

/** Decode a local file for cropping; the dialog owns and releases its temporary URL. */
export async function loadProfilePicture(file: File): Promise<{ image: HTMLImageElement; dispose: () => void }> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); }
    catch { throw new Error("This image could not be read. Choose another picture."); }
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("This image has no usable dimensions.");
    return { image, dispose: () => URL.revokeObjectURL(url) };
  } catch (cause) {
    URL.revokeObjectURL(url);
    throw cause;
  }
}

/** The selected crop uses the same 256-pixel JPEG format as existing uploads. */
export function prepareProfilePicture(image: HTMLImageElement, crop: SquareCrop): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the picture.");
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, 256, 256);
  context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, 256, 256);
  const picture = canvas.toDataURL("image/jpeg", 0.85);
  if (!picture.startsWith("data:image/jpeg;base64,") || picture.length > 350_000) {
    throw new Error("The picture could not be resized. Choose another image.");
  }
  return picture;
}
