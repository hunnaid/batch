import { expect, test } from "bun:test";
import { MAX_PROFILE_ZOOM, panProfileCrop, profileCrop } from "../web/src/profile-crop.ts";
import { loadProfilePicture } from "../web/src/profile-picture.ts";

test("landscape and portrait photos begin with a centered square crop", () => {
  expect(profileCrop(1200, 800)).toEqual({ x: 200, y: 0, size: 800 });
  expect(profileCrop(800, 1200)).toEqual({ x: 0, y: 200, size: 800 });
  expect(profileCrop(800, 800)).toEqual({ x: 0, y: 0, size: 800 });
});

test("zoom keeps the chosen subject centered when there is room and clamps at image edges", () => {
  expect(profileCrop(1200, 800, 2, { x: 0.7, y: 0.5 })).toEqual({ x: 640, y: 200, size: 400 });
  expect(profileCrop(1200, 800, 2, { x: 0, y: 1 })).toEqual({ x: 0, y: 400, size: 400 });
  expect(profileCrop(1200, 800, 100).size).toBe(800 / MAX_PROFILE_ZOOM);
});

test("dragging follows the pointer and uses image pixels consistently at different preview sizes", () => {
  const crop = profileCrop(1200, 800, 2);
  expect(panProfileCrop(1200, 800, crop, 20, -10, 200)).toEqual({ x: 360, y: 220, size: 400 });
  expect(panProfileCrop(1200, 800, crop, 40, -20, 400))
    .toEqual(panProfileCrop(1200, 800, crop, 20, -10, 200));
  expect(crop).toEqual({ x: 400, y: 200, size: 400 });
});

test("dragging beyond every edge never exposes an empty area outside the image", () => {
  const crop = profileCrop(1200, 800, 2);
  expect(panProfileCrop(1200, 800, crop, 10000, 10000, 280)).toEqual({ x: 0, y: 0, size: 400 });
  expect(panProfileCrop(1200, 800, crop, -10000, -10000, 280)).toEqual({ x: 800, y: 400, size: 400 });
  expect(() => panProfileCrop(1200, 800, crop, 20, 20, 0)).toThrow();
});

test("square crops remain inside small, wide and tall images at every supported zoom", () => {
  for (const [width, height] of [[64, 64], [2400, 400], [400, 2400], [1023, 767]]) {
    for (const zoom of [1, 1.5, 2, MAX_PROFILE_ZOOM]) {
      for (const center of [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }]) {
        const crop = profileCrop(width!, height!, zoom, center);
        expect(crop.x).toBeGreaterThanOrEqual(0);
        expect(crop.y).toBeGreaterThanOrEqual(0);
        expect(crop.x + crop.size).toBeLessThanOrEqual(width!);
        expect(crop.y + crop.size).toBeLessThanOrEqual(height!);
      }
    }
  }
  expect(() => profileCrop(0, 100)).toThrow();
  expect(() => profileCrop(100, Number.NaN)).toThrow();
});

test("unsupported and oversized files are rejected before browser decoding", async () => {
  await expect(loadProfilePicture(new File(["<svg/>"], "avatar.svg", { type: "image/svg+xml" })))
    .rejects.toThrow("Choose a JPEG, PNG, or WebP image.");
  await expect(loadProfilePicture(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })))
    .rejects.toThrow("Choose an image smaller than 5 MB.");
});
