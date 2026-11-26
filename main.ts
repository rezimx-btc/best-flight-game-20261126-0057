// main.ts — builds the make.fun dossier for SKYLINE COURIER.
// Copies game/ and screenshots/ into the output directory, writes a
// DETERMINISTIC dossier.json (title, summary, game file list with byte
// sizes + sha256, screenshot list with dimensions/bytes/sha256), exits 0.
// Node 22+, standard library only. No network, no wall-clock, no
// randomness anywhere in the output: two runs write byte-identical files.
//
// The repository directory comes from MAKEFUN_BOT_DIR first, then the
// directory this file lives in. The working directory is never used to
// find the repo, because the grader runs this file from elsewhere.
// The output directory comes from MAKEFUN_OUTPUT_DIR (default ./output).

import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TITLE = 'Skyline Courier';
const SUMMARY =
  'Skyline Courier is a side-view canvas flight game: pilot a small cargo plane off the runway, ' +
  'thread checkpoint rings, dodge birds and storm cells, manage fuel against gusting wind, and land ' +
  'soft on the strip to deliver the parcels. Three escalating missions (dawn, dusk crosswind, night ' +
  'storm), live score with combo multiplier and PERFECT-ring and PERFECT-landing bonuses, HUD with ' +
  'altitude, speed, fuel, wind and hull, pause and restart, keyboard + mouse controls, procedural ' +
  'WebAudio engine hum and chimes. Static web files, no network.';

const MAX_SCREENSHOT_BYTES = 262144; // 256 KiB
const EXPECTED_SCREENSHOTS = 4;

const repoDir = resolve(
  process.env.MAKEFUN_BOT_DIR ||
    process.env.MAKEFUN_REPO_DIR ||
    dirname(fileURLToPath(import.meta.url)),
);
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || join(process.cwd(), 'output'));

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

// Walk a directory recursively, returning repo-relative paths sorted by
// code unit so the order is identical on every machine and every run.
function walk(dir: string, rel: string): string[] {
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const p = rel === '' ? e.name : rel + sep + e.name;
    if (e.isDirectory()) out.push(...walk(join(dir, e.name), p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

// PNG dimensions from the IHDR chunk (bytes 16..24): width, height, big-endian.
function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    throw new Error('not a PNG file');
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function main(): void {
  const gameDir = join(repoDir, 'game');
  const shotsDir = join(repoDir, 'screenshots');

  mkdirSync(outDir, { recursive: true });
  cpSync(gameDir, join(outDir, 'game'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  // Game files: path (forward slashes), byte size, sha256. Sorted, no times.
  const gameFiles = walk(gameDir, '').map((rel) => {
    const bytes = readFileSync(join(gameDir, rel));
    return { path: 'game/' + rel.split(sep).join('/'), bytes: bytes.length, sha256: sha256(bytes) };
  });
  gameFiles.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  // Screenshots: exactly 4 PNGs, each under 256 KiB, with IHDR dimensions.
  const shotNames = walk(shotsDir, '').filter((n) => n.toLowerCase().endsWith('.png'));
  shotNames.sort();
  if (shotNames.length !== EXPECTED_SCREENSHOTS) {
    throw new Error(`expected ${EXPECTED_SCREENSHOTS} screenshots, found ${shotNames.length}`);
  }
  const screenshots = shotNames.map((rel) => {
    const bytes = readFileSync(join(shotsDir, rel));
    if (bytes.length > MAX_SCREENSHOT_BYTES) {
      throw new Error(`screenshot ${rel} is ${bytes.length} bytes, over the 256 KiB cap`);
    }
    const dims = pngDimensions(bytes);
    return {
      file: 'screenshots/' + rel.split(sep).join('/'),
      width: dims.width,
      height: dims.height,
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  });

  const dossier = {
    title: TITLE,
    summary: SUMMARY,
    game: {
      files: gameFiles,
      total_files: gameFiles.length,
      total_bytes: gameFiles.reduce((sum, f) => sum + f.bytes, 0),
    },
    screenshots,
  };

  // Entry validation: the game must have its entrypoint and at least one
  // script, otherwise the dossier would describe an unplayable entry.
  const hasIndex = gameFiles.some((f) => f.path === 'game/index.html');
  const hasScript = gameFiles.some((f) => f.path.endsWith('.js'));
  if (!hasIndex) throw new Error('game/index.html is missing');
  if (!hasScript) throw new Error('game has no .js files');

  writeFileSync(join(outDir, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');

  // Deterministic one-line summary for the grader log (no times, no paths
  // outside the repo: the same on every run).
  console.log(
    `${TITLE}: ${gameFiles.length} game files (${dossier.game.total_bytes} bytes), ` +
      `${screenshots.length} screenshots, dossier written.`,
  );
}

main();
process.exitCode = 0;
