export type SquareCrop = { x: number; y: number; size: number };
export const MAX_PROFILE_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** All coordinates refer to original image pixels, independent of preview size. */
export function profileCrop(
  width: number, height: number, zoom = 1, center = { x: 0.5, y: 0.5 },
): SquareCrop {
  if (![width, height, zoom, center.x, center.y].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error("This image has no usable dimensions.");
  }
  const size = Math.min(width, height) / clamp(zoom, 1, MAX_PROFILE_ZOOM);
  return {
    x: clamp(center.x * width - size / 2, 0, width - size),
    y: clamp(center.y * height - size / 2, 0, height - size),
    size,
  };
}

/** Move the image with the pointer while keeping the crop entirely inside it. */
export function panProfileCrop(
  width: number, height: number, crop: SquareCrop,
  deltaX: number, deltaY: number, previewSize: number,
): SquareCrop {
  if (!Number.isFinite(previewSize) || previewSize <= 0) throw new Error("The crop preview is not ready.");
  return {
    x: clamp(crop.x - deltaX * crop.size / previewSize, 0, width - crop.size),
    y: clamp(crop.y - deltaY * crop.size / previewSize, 0, height - crop.size),
    size: crop.size,
  };
}
