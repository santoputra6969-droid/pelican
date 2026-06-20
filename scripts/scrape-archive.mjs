// Scraper for puripelican.com archive (arsip) documents.
// Fetches the archive list and downloads each PDF into prisma/scraped/archieve/.
// Run: node scripts/scrape-archive.mjs
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "prisma", "scraped");
const PDF_DIR = join(OUT, "archieve");
const BASE = "https://www.puripelican.com";

async function getJson(path) {
  const res = await fetch(BASE + path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json();
}

async function main() {
  await mkdir(PDF_DIR, { recursive: true });
  console.log("== Puri Pelican archive scraper ==");

  const res = await getJson("/api/archieve/list-archieve");
  const rows = res?.data?.data ?? [];
  console.log(`  ${rows.length} archives found`);

  const manifest = [];
  for (const r of rows) {
    const id = Number(r.id);
    const url = r.document;
    if (!url) {
      console.log(`  - skip id=${id} (no document url)`);
      continue;
    }
    const filename = `${id}.pdf`;
    try {
      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
      const buf = Buffer.from(await fileRes.arrayBuffer());
      await writeFile(join(PDF_DIR, filename), buf);
      console.log(`  ✓ ${r.title} -> ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
      manifest.push({
        id,
        title: r.title,
        description: r.description ?? null,
        file: filename,
        createdBy: r.created_by ?? null,
        createdAt: r.created_at ?? null,
      });
    } catch (e) {
      console.log(`  ✗ ${r.title}: ${e.message}`);
    }
  }

  await writeFile(
    join(OUT, "archieve.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
  console.log(`\nDone. ${manifest.length} archives saved to ${PDF_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
