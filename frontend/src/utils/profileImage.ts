/** Profile image helpers for avatar/banner uploads */

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

export function readFileAsDataUrl(file: File, maxBytes: number, maxEdge = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpe?g|gif|webp)$/i)) {
      reject(new Error("Use PNG, JPEG, GIF or WebP"));
      return;
    }
    if (file.size > maxBytes) {
      reject(new Error(`Image must be under ${Math.round(maxBytes / 1024 / 1024)}MB`));
      return;
    }

    // Keep GIFs as-is so animation is preserved
    if (file.type === "image/gif" || file.size < 200_000) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
      return;
    }

    // Compress large static images so the request doesn't fail
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
