import { buildManifest } from "./build-manifest.ts";
import { tagFromManifest } from "./tag.ts";

const ROOT = Deno.cwd();
const FILES = [
  "deno.json",
  "src/provider.ts",
  "src/core.d.ts",
  "src/online-streaming-provider.d.ts",
  "scripts/build-manifest.ts",
  "scripts/load-provider.ts",
  "scripts/smoke.ts",
  "scripts/stream-smoke.ts",
  "scripts/release.ts",
  "manifest.json",
  "README.md",
];

async function git(args: string[]): Promise<{ code: number; stdout: string }> {
  const { code, stdout } = await new Deno.Command("git", {
    args,
    cwd: ROOT,
    stdout: "piped",
    stderr: "inherit",
  }).output();
  return { code, stdout: new TextDecoder().decode(stdout).trim() };
}

function parseArgs(argv: string[]): { message?: string; push: boolean } {
  const push = argv.includes("--push");
  const msgIdx = argv.indexOf("--");
  const message = msgIdx >= 0 ? argv.slice(msgIdx + 1).join(" ").trim() : undefined;
  return { message: message || undefined, push };
}

async function runPreflight(): Promise<void> {
  for (const [label, args] of [
    ["Typecheck", ["check", "--no-npm", "src/provider.ts"]],
    ["Smoke test", ["task", "test:smoke"]],
    ["Stream smoke", ["task", "test:stream"]],
  ] as const) {
    console.log(`\n${label}…`);
    const { code } = await new Deno.Command("deno", {
      args: [...args],
      cwd: ROOT,
      stderr: "inherit",
      stdout: "inherit",
    }).output();
    if (code !== 0) Deno.exit(code);
  }
}

async function main(): Promise<void> {
  const { message, push } = parseArgs(Deno.args);

  await buildManifest();

  const dirty = await git(["status", "--porcelain", "--", ...FILES]);
  if (dirty.stdout) {
    await git(["add", ...FILES]);
    const manifest = JSON.parse(await Deno.readTextFile(`${ROOT}/manifest.json`)) as {
      version: string;
    };
    const commitMsg = message ?? `Release v${manifest.version}`;
    const { code } = await new Deno.Command("git", {
      args: ["commit", "-m", commitMsg],
      cwd: ROOT,
      stderr: "inherit",
    }).output();
    if (code !== 0) Deno.exit(code);
  }

  await runPreflight();

  const tag = await tagFromManifest();

  const pushCmd = `git push origin main && git push origin ${tag}`;
  if (push) {
    const { code } = await new Deno.Command("sh", {
      args: ["-c", pushCmd],
      cwd: ROOT,
      stderr: "inherit",
      stdout: "inherit",
    }).output();
    if (code !== 0) Deno.exit(code);
  } else {
    console.log(pushCmd);
  }
}

if (import.meta.main) {
  await main();
}
