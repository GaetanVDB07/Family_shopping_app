import { readFileSync } from "fs";
import path from "path";
import { gzipSync } from "zlib";

const publicDir = path.resolve("dist/public");
const html = readFileSync(path.join(publicDir, "index.html"), "utf-8");
const assetPaths = [
  ...new Set(
    Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)).map(
      (match) => match[1],
    ),
  ),
];

const initialAssets = assetPaths.map((assetPath) => {
  const contents = readFileSync(path.join(publicDir, assetPath.replace(/^\//, "")));
  return {
    assetPath,
    gzipBytes: gzipSync(contents).byteLength,
  };
});

const totalGzipBytes = initialAssets.reduce((total, asset) => total + asset.gzipBytes, 0);
const maximumGzipBytes = 125 * 1024;
const accidentallyPreloaded = initialAssets.filter((asset) =>
  /(?:sortable|dnd)/i.test(asset.assetPath),
);

if (accidentallyPreloaded.length > 0) {
  throw new Error(
    `Deferred interaction code was preloaded: ${accidentallyPreloaded.map((asset) => asset.assetPath).join(", ")}`,
  );
}

if (totalGzipBytes > maximumGzipBytes) {
  throw new Error(
    `Initial assets exceed the 125 KiB gzip budget: ${totalGzipBytes} bytes`,
  );
}

console.log(JSON.stringify({
  initialGzipBytes: totalGzipBytes,
  initialGzipKiB: Number((totalGzipBytes / 1024).toFixed(1)),
  budgetGzipKiB: maximumGzipBytes / 1024,
  assets: initialAssets,
}));
