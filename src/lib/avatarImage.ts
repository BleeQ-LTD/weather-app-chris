// Turning a photo someone picks into a small profile picture, in the browser.
// It's stored on their Firestore profile (Cloud Storage would need the Blaze plan),
// so it has to be small: firestore.rules allow at most MAX_PHOTO_CHARS.

export const AVATAR_SIZE = 160; // pixels; sharp at the 72px it's shown, on high-density screens
export const MAX_PHOTO_CHARS = 60_000; // must match isOptionalPhoto in firestore.rules
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // what we accept before shrinking
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// In:  the file's type and size.
// Out: a message saying what's wrong, or null when the file can be used.
export function checkAvatarFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Choose a JPG, PNG, WebP or GIF image.";
  if (file.size > MAX_FILE_BYTES) return "That image is larger than 10 MB. Choose a smaller one.";
  if (file.size === 0) return "That file is empty. Choose another image.";
  return null;
}

// In:  an image file.
// Out: a 160x160 JPEG as text ("data:image/jpeg;base64,..."), cropped to the centre square.
// Throws if the browser can't read the image or it can't be made small enough.
export async function makeAvatar(file: Blob): Promise<string> {
  const image = await createImageBitmap(file); // also applies the photo's rotation
  try {
    const side = Math.min(image.width, image.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available");
    context.fillStyle = "#ffffff"; // transparent PNGs get a white background, not black
    context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    );
    // Start at good quality and step down until it fits
    for (const quality of [0.85, 0.75, 0.6, 0.45]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_PHOTO_CHARS) return dataUrl;
    }
    throw new Error("Couldn't make the photo small enough");
  } finally {
    image.close();
  }
}
