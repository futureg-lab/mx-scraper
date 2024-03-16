import { MXPlugin } from "../core/mx_plugin.ts";

// With deno compile, import(..) can only work with modules that can be statically loaded
// Note: import_map does not work!
const lazyParking = {
  "Example": async () => new (await import("./examples/example.ts")).default(),
  "GPrincess": async () =>
    new (await import("./examples/gprincess.ts")).default(),
  "Eyval": async () => new (await import("./examples/eyval.ts")).default(),
  "EHentai": async () => new (await import("./examples/ehentai.ts")).default(),
  "NHentai": async () => new (await import("./examples/nhentai.ts")).default(),
  "HentaiKage": async () =>
    new (await import("./examples/hentaikage.ts")).default(),
  "Rule34Comic": async () =>
    new (await import("./examples/rule34comic.ts")).default(),
} as Record<string, () => Promise<unknown>>;

export async function resolveModule(name: string): Promise<MXPlugin> {
  for (const [parkId, loader] of Object.entries(lazyParking)) {
    if (name.toLowerCase() == parkId.toLowerCase()) {
      return (await loader()) as MXPlugin;
    }
  }
  throw new Error(`plugin id "${name}" not present or cannot be loaded`);
}

export function getParkedModuleNames() {
  return Object.keys(lazyParking);
}
