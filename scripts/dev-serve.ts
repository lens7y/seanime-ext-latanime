import { installUrl } from "./dev-manifest.ts";

const port = Number(Deno.env.get("DEV_PORT") ?? "8787");
const host = Deno.env.get("DEV_HOST") ?? "127.0.0.1";
const root = Deno.cwd();

Deno.serve({ port, hostname: host }, async (req) => {
  try {
    const path = decodeURIComponent(new URL(req.url).pathname);
    return new Response(await Deno.readFile(`${root}${path}`), {
      headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
});

console.log(installUrl);
console.log(`After editing ${"src/provider.ts"}, run deno task dev:manifest and Update in Seanime.\n`);
