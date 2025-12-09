"use client";

import { useEffect, useState } from "react";

function bytesToLabel(bytes) {
  if (!bytes && bytes !== 0) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export default function OptimizerPanel() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [format, setFormat] = useState("webp");
  const [targetSizeKB, setTargetSizeKB] = useState(300);
  const [quality, setQuality] = useState(80);
  const [resizePercent, setResizePercent] = useState(100);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [renameMode, setRenameMode] = useState("suffix");
  const [customPrefix, setCustomPrefix] = useState("tritorc");

  const [autoOptimize, setAutoOptimize] = useState(false);

  const [sortBy, setSortBy] = useState("name");
  const [filterFormat, setFilterFormat] = useState("all");

  const [dragIndex, setDragIndex] = useState(null);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [history, setHistory] = useState([]);

  const [infoModalFile, setInfoModalFile] = useState(null);
  const [compareModal, setCompareModal] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("tritorcImageHistory");
    if (raw) {
      try {
        setHistory(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const updateHistory = (entry) => {
    const newHistory = [entry, ...history].slice(0, 20);
    setHistory(newHistory);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "tritorcImageHistory",
        JSON.stringify(newHistory)
      );
    }
  };

  const createPreviewForFile = (file) => {
    const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const url = URL.createObjectURL(file);
    const item = {
      id,
      file,
      url,
      width: null,
      height: null,
      type: file.type || "image",
      size: file.size
    };

    const img = new Image();
    img.onload = () => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, width: img.naturalWidth, height: img.naturalHeight } : f
        )
      );
      URL.revokeObjectURL(img.src);
    };
    img.src = url;

    return item;
  };

  const onDrop = (droppedFiles) => {
    const valid = Array.from(droppedFiles).filter((file) =>
      file.type.startsWith("image/")
    );
    if (valid.length === 0) return;
    const newItems = valid.map(createPreviewForFile);
    setFiles((prev) => [...prev, ...newItems]);
  };

  const handleDropZone = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    } else if (e.type === "drop") {
      setIsDragging(false);
      onDrop(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    onDrop(e.target.files);
    e.target.value = "";
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.url) URL.revokeObjectURL(found.url);
      return prev.filter((f) => f.id !== id);
    });
  };

  const clearFiles = () => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.url) URL.revokeObjectURL(f.url);
      });
      return [];
    });
  };

  const sortedFilteredFiles = (() => {
    let list = [...files];
    if (filterFormat !== "all") {
      list = list.filter((f) =>
        (f.type || "").toLowerCase().includes(filterFormat)
      );
    }
    list.sort((a, b) => {
      if (sortBy === "size") return b.size - a.size;
      if (sortBy === "type") return (a.type || "").localeCompare(b.type || "");
      return a.file.name.localeCompare(b.file.name);
    });
    return list;
  })();

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOverItem = (e, overIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    setFiles((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(overIndex, 0, moved);
      return arr;
    });
    setDragIndex(overIndex);
  };

  const autoOptimizeSettings = () => {
    if (files.length === 0) return;

    const maxSize = Math.max(...files.map((f) => f.size));
    const anyPng = files.some((f) => (f.type || "").includes("png"));

    let newFormat = format;
    let newTarget = targetSizeKB;
    let newQuality = quality;
    let newResize = resizePercent;

    if (anyPng) newFormat = "webp";

    if (maxSize > 3 * 1024 * 1024) {
      newResize = 80;
      newTarget = 300;
      newQuality = 80;
    } else if (maxSize > 1 * 1024 * 1024) {
      newResize = 90;
      newTarget = 350;
      newQuality = 85;
    } else {
      newResize = 100;
      newTarget = 250;
      newQuality = 80;
    }

    setFormat(newFormat);
    setTargetSizeKB(newTarget);
    setQuality(newQuality);
    setResizePercent(newResize);
  };

  useEffect(() => {
    if (autoOptimize) {
      autoOptimizeSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOptimize, files.length]);

  const handleOptimize = async () => {
    if (files.length === 0 || isOptimizing) return;

    setIsOptimizing(true);
    try {
      const form = new FormData();
      files.forEach((item) => form.append("images", item.file));
      form.append("format", format);
      form.append("targetSizeKB", String(targetSizeKB));
      form.append("quality", String(quality));
      form.append("resizePercent", String(resizePercent));
      form.append("stripMetadata", String(stripMetadata));
      form.append("renameMode", renameMode);
      form.append("customPrefix", customPrefix || "");

      const totalOriginalBytes = files.reduce((sum, f) => sum + f.size, 0);

      const res = await fetch("/api/optimize", {
        method: "POST",
        body: form
      });

      if (!res.ok) {
        const text = await res.text();
        alert("Optimization failed: " + text);
        setIsOptimizing(false);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");

      if (files.length === 1) {
        const fileItem = files[0];
        const originalUrl = fileItem.url;
        const optimizedUrl = URL.createObjectURL(blob);

        setCompareModal({
          originalUrl,
          optimizedUrl,
          originalSize: fileItem.size,
          optimizedSize: blob.size,
          name: fileItem.file.name,
          format
        });

        updateHistory({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          fileCount: 1,
          originalBytes: totalOriginalBytes,
          optimizedBytes: blob.size,
          format
        });
      } else {
        const downloadUrl = URL.createObjectURL(blob);
        let filename = "tritorc-images-optimized.zip";
        if (disposition) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          if (match?.[1]) filename = match[1];
        }
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);

        updateHistory({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          fileCount: files.length,
          originalBytes: totalOriginalBytes,
          optimizedBytes: blob.size,
          format
        });
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while optimizing.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const downloadFromCompareModal = () => {
    if (!compareModal) return;
    const { optimizedUrl, name } = compareModal;
    const a = document.createElement("a");
    a.href = optimizedUrl;
    a.download = name.replace(/\.[^/.]+$/, "") + "-optimized." + format;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const closeCompareModal = () => {
    if (compareModal?.optimizedUrl) {
      URL.revokeObjectURL(compareModal.optimizedUrl);
    }
    setCompareModal(null);
  };

  return (
    <div className="grid md:grid-cols-[2fr,1.3fr] gap-6">
      {/* LEFT: Upload + Settings */}
      <div className="space-y-4">
        {/* Upload Card */}
        <div
          className={`bg-white rounded-2xl border shadow-sm p-4 md:p-6 transition-all ${
            isDragging ? "border-tritorcRed ring-2 ring-tritorcRed/40" : ""
          }`}
          onDragEnter={handleDropZone}
          onDragOver={handleDropZone}
          onDragLeave={handleDropZone}
          onDrop={handleDropZone}
        >
          <h2 className="text-lg font-semibold mb-2">Upload Images</h2>
          <p className="text-sm text-gray-500 mb-4">
            Drag &amp; drop images here or click to browse. Supports JPG, PNG, WEBP, etc.
          </p>

          <label className="block cursor-pointer">
            <div className="border-2 border-dashed rounded-2xl py-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition">
              <span className="text-sm font-medium text-gray-700">
                {isDragging ? "Drop images to upload" : "Drag & drop or click to select"}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                You can upload multiple images
              </span>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3 items-center justify-between text-xs">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-medium text-gray-600">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-lg px-2 py-1"
                >
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                  <option value="type">Type</option>
                </select>
                <span className="font-medium text-gray-600 ml-2">Filter:</span>
                <select
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                  className="border rounded-lg px-2 py-1"
                >
                  <option value="all">All</option>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              <div className="text-gray-500">
                {files.length} image{files.length > 1 ? "s" : ""} selected
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-3 space-y-2 max-h-64 overflow-auto">
              {sortedFilteredFiles.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 text-sm bg-gray-50 rounded-xl px-3 py-2"
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOverItem(e, idx)}
                >
                  {item.url && (
                    <button
                      type="button"
                      className="h-10 w-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0"
                      onClick={() => setInfoModalFile(item)}
                    >
                      <img
                        src={item.url}
                        alt={item.file.name}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {bytesToLabel(item.size)} • {item.type || "image"}
                      {item.width && item.height
                        ? ` • ${item.width}×${item.height}px`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => setInfoModalFile(item)}
                      className="text-[11px] text-gray-600 hover:text-tritorcRed"
                    >
                      Info
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="text-[11px] text-gray-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Optimization Settings</h2>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={autoOptimize}
                onChange={(e) => setAutoOptimize(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-gray-700">Auto optimize</span>
            </label>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="text-sm font-medium">Presets</label>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFormat("webp");
                  setTargetSizeKB(300);
                  setQuality(80);
                  setResizePercent(100);
                  setStripMetadata(true);
                }}
                className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 hover:bg-tritorcRed hover:text-white transition"
              >
                Website
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormat("jpeg");
                  setTargetSizeKB(120);
                  setQuality(70);
                  setResizePercent(80);
                  setStripMetadata(true);
                }}
                className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 hover:bg-tritorcRed hover:text-white transition"
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormat("jpeg");
                  setTargetSizeKB(700);
                  setQuality(95);
                  setResizePercent(100);
                  setStripMetadata(false);
                }}
                className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 hover:bg-tritorcRed hover:text-white transition"
              >
                Catalogue
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormat("webp");
                  setTargetSizeKB(500);
                  setQuality(85);
                  setResizePercent(100);
                  setStripMetadata(true);
                }}
                className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 hover:bg-tritorcRed hover:text-white transition"
              >
                LinkedIn Ad
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormat("jpeg");
                  setTargetSizeKB(180);
                  setQuality(75);
                  setResizePercent(70);
                  setStripMetadata(true);
                }}
                className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 hover:bg-tritorcRed hover:text-white transition"
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormat("jpeg");
                  setTargetSizeKB(300);
                  setQuality(85);
                  setResizePercent(85);
                  setStripMetadata(false);
                }}
                className="px-3 py-1.5 rounded-lg font-semibold bg-gray-100 hover:bg-tritorcRed hover:text-white transition"
              >
                PPT
              </button>
            </div>
          </div>

          {/* Format */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Output format</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tritorcRed"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="webp">WebP (recommended)</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="avif">AVIF</option>
            </select>
          </div>

          {/* Target size slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Target max size per image</span>
              <span className="text-gray-500">{targetSizeKB} KB</span>
            </div>
            <input
              type="range"
              min={50}
              max={2000}
              value={targetSizeKB}
              onChange={(e) => setTargetSizeKB(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              The optimizer will try to keep each image under this size.
            </p>
          </div>

          {/* Quality slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Base quality</span>
              <span className="text-gray-500">{quality}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Higher quality means better visuals but larger files.
            </p>
          </div>

          {/* Resize slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Resize (percentage)</span>
              <span className="text-gray-500">{resizePercent}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={resizePercent}
              onChange={(e) => setResizePercent(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              100% keeps original resolution. Lower values downscale images.
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2">
            <input
              id="stripMeta"
              type="checkbox"
              checked={stripMetadata}
              onChange={(e) => setStripMetadata(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="stripMeta" className="text-sm text-gray-700">
              Strip EXIF metadata (recommended for smaller files)
            </label>
          </div>

          {/* Rename options */}
          <div className="space-y-2 pt-1 border-t mt-2">
            <div className="text-sm font-medium">File naming</div>
            <div className="grid gap-1 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="renameMode"
                  value="original"
                  checked={renameMode === "original"}
                  onChange={(e) => setRenameMode(e.target.value)}
                />
                <span>Keep original name</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="renameMode"
                  value="suffix"
                  checked={renameMode === "suffix"}
                  onChange={(e) => setRenameMode(e.target.value)}
                />
                <span>
                  Append <code className="bg-gray-100 px-1 rounded">-optimized</code>
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="renameMode"
                  value="timestamp"
                  checked={renameMode === "timestamp"}
                  onChange={(e) => setRenameMode(e.target.value)}
                />
                <span>Prefix with date/time</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="renameMode"
                  value="custom"
                  checked={renameMode === "custom"}
                  onChange={(e) => setRenameMode(e.target.value)}
                />
                <span>Custom prefix</span>
              </label>
            </div>
            {renameMode === "custom" && (
              <input
                type="text"
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value)}
                placeholder="tritorc"
                className="mt-1 border rounded-lg px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-tritorcRed"
              />
            )}
          </div>

          {/* Actions */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={isOptimizing || files.length === 0}
                onClick={handleOptimize}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-tritorcRed hover:bg-red-700 transition-colors ${
                  (isOptimizing || files.length === 0) &&
                  "opacity-60 cursor-not-allowed"
                }`}
              >
                {isOptimizing
                  ? "Optimizing..."
                  : `Optimize ${files.length || ""} image${
                      files.length === 1 ? "" : "s"
                    }`}
              </button>

              <button
                type="button"
                onClick={clearFiles}
                className="text-xs text-gray-600 hover:text-tritorcRed"
              >
                Clear list
              </button>
            </div>

            {isOptimizing && (
              <div className="mt-1">
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-tritorcRed animate-pulse" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Optimizing images... This may take a few seconds for large files.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: History */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border shadow-sm p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-2">Recent Activity</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">
              No optimizations yet. Results will appear here.
            </p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {history.map((item) => {
                const saved =
                  (item.originalBytes || 0) - (item.optimizedBytes || 0);
                return (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-xl px-3 py-2.5 text-xs"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {item.fileCount} image
                        {item.fileCount > 1 ? "s" : ""} →{" "}
                        {item.format?.toUpperCase()}
                      </span>
                      <span className="text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Original: {bytesToLabel(item.originalBytes)}</span>
                      <span>Optimized: {bytesToLabel(item.optimizedBytes)}</span>
                      <span className="text-green-700">
                        Saved: {bytesToLabel(saved)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-4 md:p-6 text-xs text-gray-500">
          <h3 className="font-semibold mb-1 text-sm">Usage tips</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Use <span className="font-medium">Website</span> preset for
              tritorc.com product &amp; category images.
            </li>
            <li>
              For WhatsApp sharing, use the{" "}
              <span className="font-medium">WhatsApp</span> preset or keep under{" "}
              <span className="font-medium">150 KB</span>.
            </li>
            <li>
              For brochures &amp; PPT, use{" "}
              <span className="font-medium">Catalogue</span> or{" "}
              <span className="font-medium">PPT</span> presets.
            </li>
            <li>
              Remember to downscale very large images using the{" "}
              <span className="font-medium">resize slider</span>.
            </li>
          </ul>
        </div>
      </div>

      {/* Metadata / info modal */}
      {infoModalFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 md:p-6 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">Image details</h3>
              <button
                onClick={() => setInfoModalFile(null)}
                className="text-xs text-gray-500 hover:text-tritorcRed"
              >
                Close
              </button>
            </div>
            <div className="flex gap-4">
              <div className="w-40 h-40 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                {infoModalFile.url && (
                  <img
                    src={infoModalFile.url}
                    alt={infoModalFile.file.name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="flex-1 text-xs space-y-1">
                <div>
                  <span className="font-medium">Name: </span>
                  <span className="break-all">
                    {infoModalFile.file.name}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Type: </span>
                  {infoModalFile.type || "image"}
                </div>
                <div>
                  <span className="font-medium">Size: </span>
                  {bytesToLabel(infoModalFile.size)}
                </div>
                <div>
                  <span className="font-medium">Resolution: </span>
                  {infoModalFile.width && infoModalFile.height
                    ? `${infoModalFile.width} × ${infoModalFile.height}px`
                    : "Detecting..."}
                </div>
                <div className="mt-2 text-gray-500">
                  This basic inspector shows file type, size &amp; resolution.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Before/after compare modal for single image */}
      {compareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 md:p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">Optimization preview</h3>
              <button
                onClick={closeCompareModal}
                className="text-xs text-gray-500 hover:text-tritorcRed"
              >
                Close
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs font-medium mb-1">Before</div>
                <div className="border rounded-xl bg-gray-50 h-64 flex items-center justify-center overflow-hidden">
                  {compareModal.originalUrl && (
                    <img
                      src={compareModal.originalUrl}
                      alt="Before"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                <div className="mt-2 text-[11px] text-gray-600">
                  Size: {bytesToLabel(compareModal.originalSize)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1">After</div>
                <div className="border rounded-xl bg-gray-50 h-64 flex items-center justify-center overflow-hidden">
                  {compareModal.optimizedUrl && (
                    <img
                      src={compareModal.optimizedUrl}
                      alt="After"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
                <div className="mt-2 text-[11px] text-gray-600">
                  Size: {bytesToLabel(compareModal.optimizedSize)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div>
                <div className="font-medium mb-1">
                  {compareModal.name.replace(/\.[^/.]+$/, "")}
                </div>
                <div className="text-gray-600">
                  Saved{" "}
                  <span className="font-semibold text-green-700">
                    {bytesToLabel(
                      compareModal.originalSize - compareModal.optimizedSize
                    )}
                  </span>{" "}
                  (
                  {(
                    (1 -
                      compareModal.optimizedSize /
                        compareModal.originalSize) *
                    100
                  ).toFixed(1)}
                  % smaller)
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={downloadFromCompareModal}
                  className="px-3 py-1.5 rounded-lg bg-tritorcRed text-white text-xs font-semibold hover:bg-red-700"
                >
                  Download optimized
                </button>
                <button
                  type="button"
                  onClick={closeCompareModal}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-gray-700 hover:border-tritorcRed hover:text-tritorcRed"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
