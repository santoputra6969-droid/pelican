// Scraper for puripelican.com public API -> JSON files in prisma/scraped/
// Run: node scripts/scrape-pelican.mjs
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "prisma", "scraped");
const BASE = "https://www.puripelican.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(BASE + path, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

// limited concurrency map
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

function save(name, data) {
  return writeFile(join(OUT, name), JSON.stringify(data, null, 2), "utf8");
}

// RFC-1123 date string used by the journal endpoint
function rfc(d) {
  return d.toUTCString();
}

async function scrapeJournal() {
  // 31-day max window; walk monthly from start to now
  const all = [];
  const seen = new Set();
  const now = new Date();
  let cursor = new Date(Date.UTC(2024, 0, 1)); // start Jan 2024
  while (cursor < now) {
    const end = new Date(cursor);
    end.setUTCDate(end.getUTCDate() + 30);
    const s = encodeURIComponent(rfc(cursor));
    const e = encodeURIComponent(rfc(end > now ? now : end));
    try {
      const j = await getJson(
        `/api/journal_trans/list_journal_trans?start_period=${s}&end_period=${e}&category=&mutation=&type=`
      );
      const rows = j?.data?.data ?? [];
      for (const r of rows) {
        const key = r.id ?? `${r.id_settlement}-${r.created_at}`;
        if (!seen.has(key)) {
          seen.add(key);
          all.push(r);
        }
      }
      process.stdout.write(
        `  journal ${cursor.toISOString().slice(0, 10)}: +${rows.length} (total ${all.length})\n`
      );
    } catch (err) {
      process.stdout.write(
        `  journal ${cursor.toISOString().slice(0, 10)}: ERR ${err.message}\n`
      );
    }
    cursor = new Date(end);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    await sleep(150);
  }
  return all;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log("== Puri Pelican scraper ==");

  // 1. Houses
  console.log("Houses...");
  const housesRes = await getJson("/api/house/list_house");
  const houses = housesRes?.data?.data ?? [];
  await save("houses.json", houses);
  console.log(`  ${houses.length} houses`);

  // 2. Balance, banners, information, transaction types
  console.log("Balance, banners, info, tx-types...");
  const [balance, banners, information, txTypes] = await Promise.all([
    getJson("/api/balance/get_balance"),
    getJson("/api/banner/list-banner"),
    getJson("/api/information/list-information"),
    getJson("/api/journal_trans/list_transaction_types"),
  ]);
  await save("balance.json", balance?.data?.data ?? balance);
  await save("banners.json", banners?.data?.data ?? []);
  await save("information.json", information?.data?.data ?? []);
  await save("transaction_types.json", txTypes?.data?.data ?? []);

  // 3. Per-house: name + bills (unpaid + paid)
  console.log("Per-house names & bills...");
  let done = 0;
  const houseDetails = await mapLimit(houses, 8, async (h) => {
    const id = h.id;
    const [nameRes, unpaidRes, paidRes] = await Promise.all([
      getJson(`/api/detail-house-name?id=${id}`).catch(() => null),
      getJson(`/api/ipl/list_ipl_by_house?houseid=${id}`).catch(() => null),
      getJson(`/api/ipl/list_ipl_paid_by_house?houseid=${id}`).catch(() => null),
    ]);
    done++;
    if (done % 25 === 0) console.log(`  ${done}/${houses.length}`);
    return {
      id,
      block: h.block,
      no: h.no,
      name: nameRes?.data?.name ?? null,
      name_source: nameRes?.data?.source ?? null,
      unpaid: unpaidRes?.data?.data ?? [],
      paid: paidRes?.data?.data ?? [],
    };
  });
  await save("house_details.json", houseDetails);
  const totalUnpaid = houseDetails.reduce((a, h) => a + h.unpaid.length, 0);
  const totalPaid = houseDetails.reduce((a, h) => a + h.paid.length, 0);
  console.log(`  bills: ${totalUnpaid} unpaid, ${totalPaid} paid`);

  // 4. Journal transactions (paginated monthly)
  console.log("Journal transactions...");
  const journal = await scrapeJournal();
  await save("transactions.json", journal);
  console.log(`  ${journal.length} transactions`);

  console.log(`\nDone. Files written to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
