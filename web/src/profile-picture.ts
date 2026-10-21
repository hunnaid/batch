/** Decode an uploaded raster file and produce a small, metadata-free avatar. */
export async function prepareProfilePicture(file: File): Promise<string> {
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
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side) throw new Error("This image has no usable dimensions.");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the picture.");
    context.fillStyle = "#fffdf8";
    context.fillRect(0, 0, 256, 256);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
      side, side, 0, 0, 256, 256);
    const picture = canvas.toDataURL("image/jpeg", 0.85);
    if (!picture.startsWith("data:image/jpeg;base64,") || picture.length > 350_000) {
      throw new Error("The picture could not be resized. Choose another image.");
    }
    return picture;
  } finally {
    URL.revokeObjectURL(url);
  }
}
