import Sharp from "sharp";
import JSZip from "jszip";

export const runtime = "nodejs";

function buildFileName(originalName, format, mode, customPrefix) {
  const base = originalName.replace(/\.[^/.]+$/, "");
  const safeFormat = format || originalName.split(".").pop() || "webp";

  if (mode === "original") {
    return `${base}.${safeFormat}`;
  }

  if (mode === "timestamp") {
    const d = new Date();
    const stamp = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
      String(d.getHours()).padStart(2, "0"),
      String(d.getMinutes()).padStart(2, "0")
    ].join("");
    return `${stamp}-${base}.${safeFormat}`;
  }

  if (mode === "custom" && customPrefix) {
    return `${customPrefix}-${base}.${safeFormat}`;
  }

  return `${base}-optimized.${safeFormat}`;
}

export async function POST(req) {
  try {
    const formData = await req.formData();

    const format = (formData.get("format") || "webp").toLowerCase();
    const targetSizeKB = Number(formData.get("targetSizeKB") || 300);
    const baseQuality = Number(formData.get("quality") || 80);
    const resizePercent = Number(formData.get("resizePercent") || 100);
    const stripMetadata = formData.get("stripMetadata") === "true";
    const renameMode = formData.get("renameMode") || "suffix";
    const customPrefix = formData.get("customPrefix") || "";

    const fileFields = formData.getAll("images");
    if (!fileFields || fileFields.length === 0) {
      return new Response("No images provided", { status: 400 });
    }

    const processed = [];
    let totalOriginalBytes = 0;

    for (const file of fileFields) {
      if (!(file instanceof File)) continue;

      const arrayBuffer = await file.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      totalOriginalBytes += inputBuffer.length;

      let sharpInstance = Sharp(inputBuffer);
      const metadata = await sharpInstance.metadata();

      if (resizePercent > 0 && resizePercent < 100 && metadata.width) {
        const factor = resizePercent / 100;
        const width = Math.round(metadata.width * factor);
        const height = metadata.height
          ? Math.round(metadata.height * factor)
          : undefined;
        sharpInstance = sharpInstance.resize(width, height);
      }

      if (!stripMetadata) {
        sharpInstance = sharpInstance.withMetadata();
      }

      const encode = async (q) => {
        switch (format) {
          case "jpeg":
          case "jpg":
            return sharpInstance.jpeg({ quality: q }).toBuffer();
          case "png":
            return sharpInstance.png().toBuffer();
          case "avif":
            return sharpInstance.avif({ quality: q }).toBuffer();
          case "webp":
          default:
            return sharpInstance.webp({ quality: q }).toBuffer();
        }
      };

      let quality = baseQuality;
      let outputBuffer = await encode(quality);

      if (targetSizeKB > 0) {
        while (outputBuffer.byteLength / 1024 > targetSizeKB && quality > 30) {
          quality -= 5;
          outputBuffer = await encode(quality);
        }
      }

      const filename = buildFileName(file.name, format, renameMode, customPrefix);

      processed.push({
        buffer: outputBuffer,
        filename
      });
    }

    if (processed.length === 1) {
      const { buffer, filename } = processed[0];
      return new Response(buffer, {
        headers: {
          "Content-Type": `image/${format}`,
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    const zip = new JSZip();

    for (const item of processed) {
      zip.file(item.filename, item.buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="tritorc-images-optimized.zip"'
      }
    });
  } catch (err) {
    console.error(err);
    return new Response("Internal error while optimizing images", {
      status: 500
    });
  }
}
