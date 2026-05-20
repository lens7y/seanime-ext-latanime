/// <reference path="../src/core.d.ts" />
/// <reference path="../src/online-streaming-provider.d.ts" />

export type ProviderCtor = new () => AnimeProvider;

export function installTestGlobals(): void {
  // @ts-ignore: CryptoJS is injected by Seanime at runtime
  globalThis.CryptoJS = {
    enc: {
      Utf8: { stringify: () => "" },
      Base64: { parse: () => new Uint8Array() },
    },
  } as CryptoJS;
}

// Seanime requires a script-style top-level `class Provider` (no export).
export async function loadProvider(): Promise<ProviderCtor> {
  installTestGlobals();

  const providerUrl = new URL("../src/provider.ts", import.meta.url);
  let code = await Deno.readTextFile(providerUrl);
  code = code
    .replace(
      '/// <reference path="./core.d.ts" />',
      '/// <reference path="../src/core.d.ts" />',
    )
    .replace(
      '/// <reference path="./online-streaming-provider.d.ts" />',
      '/// <reference path="../src/online-streaming-provider.d.ts" />',
    )
    .trimEnd() +
    "\n\n(globalThis as Record<string, unknown>).Provider = Provider;\n";

  const entryUrl = new URL("../.test-artifacts/provider-entry.ts", import.meta.url);
  await Deno.mkdir(new URL("../.test-artifacts/", import.meta.url), { recursive: true });
  await Deno.writeTextFile(entryUrl, code);
  await import(entryUrl.href);

  const ctor = (globalThis as { Provider?: ProviderCtor }).Provider;
  if (!ctor) throw new Error("Provider not registered after loading test entry");
  return ctor;
}
