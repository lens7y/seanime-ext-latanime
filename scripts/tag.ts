const MANIFEST = `${Deno.cwd()}/manifest.json`;

async function git(args: string[]): Promise<{ code: number; stdout: string }> {
  const { code, stdout } = await new Deno.Command("git", {
    args,
    stdout: "piped",
    stderr: "inherit",
  }).output();
  return { code, stdout: new TextDecoder().decode(stdout).trim() };
}

export async function tagFromManifest(): Promise<string> {
  const { version } = JSON.parse(await Deno.readTextFile(MANIFEST)) as {
    version: string;
  };
  const tag = `v${version}`;

  const repo = await git(["rev-parse", "--git-dir"]);
  if (repo.code !== 0) {
    console.error("Not a git repository");
    Deno.exit(1);
  }

  const existing = await git(["tag", "-l", tag]);
  if (existing.stdout === tag) {
    console.error(`Tag ${tag} already exists`);
    Deno.exit(1);
  }

  const { code } = await new Deno.Command("git", {
    args: ["tag", "-a", tag, "-m", `Release ${tag}`],
    stderr: "inherit",
  }).output();

  if (code !== 0) Deno.exit(code);
  return tag;
}

