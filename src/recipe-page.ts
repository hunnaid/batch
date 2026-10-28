import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { InvalidImportUrl, NoRecipeFound } from "./recipe-import-errors.ts";

const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4");
blocked.addSubnet("2001::", 23, "ipv6");
blocked.addSubnet("2001:db8::", 32, "ipv6");
blocked.addSubnet("2002::", 16, "ipv6");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");

export function publicRecipeAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? !blocked.check(address, "ipv4") :
    family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function normalizeRecipeUrl(value: string): string {
  try {
    if (value.length > 2048) throw new Error();
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
        url.port || !host.includes(".") || isIP(host.replace(/^\[|\]$/g, "")) ||
        !/^[a-z0-9.-]+$/.test(host) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) throw new Error();
    url.hostname = host;
    url.hash = "";
    return url.href;
  } catch { throw new InvalidImportUrl("Enter a public HTTP or HTTPS recipe page URL."); }
}

/** Use the validated DNS answer for the connection, retaining the URL's TLS name. */
export function pinnedRecipeLookup(addresses: LookupAddress[]): LookupFunction {
  return (_hostname, options, done) => {
    const first = addresses[0]!;
    if (options.all) done(null, addresses);
    else done(null, first.address, first.family);
  };
}

type PageResponse = { status: number; location?: string; contentType?: string; body?: string };
type PageDependencies = {
  resolve?: (host: string) => Promise<LookupAddress[]>;
  request?: (url: URL, addresses: LookupAddress[], signal: AbortSignal) => Promise<PageResponse>;
};

function requestPage(url: URL, addresses: LookupAddress[], signal: AbortSignal): Promise<PageResponse> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      agent: false, lookup: pinnedRecipeLookup(addresses), signal,
      headers: { Accept: "text/html, application/xhtml+xml", "Accept-Encoding": "identity", "User-Agent": "Batch/1.0 recipe importer" },
    }, async (response) => {
      const status = response.statusCode ?? 0;
      const contentType = response.headers["content-type"] ?? "";
      if (status !== 200 || !/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(contentType)) {
        resolve({ status, location: response.headers.location, contentType });
        response.destroy();
        return;
      }
      const encoding = response.headers["content-encoding"]?.toLowerCase();
      const decoder = encoding === "gzip" ? createGunzip() : encoding === "br" ? createBrotliDecompress() :
        encoding === "deflate" ? createInflate() : undefined;
      if (encoding && encoding !== "identity" && !decoder) {
        response.destroy(); reject(new NoRecipeFound("Unsupported recipe page encoding.")); return;
      }
      const stream = decoder ? response.pipe(decoder) : response;
      // Bound both the download and the decompressed body, including compressed bombs.
      let wireBytes = 0;
      response.on("data", (chunk: Buffer) => {
        wireBytes += chunk.length;
        if (wireBytes > MAX_PAGE_BYTES) request.destroy(new NoRecipeFound("Recipe page is too large."));
      });
      response.on("error", (error) => { decoder?.destroy(error); reject(error); });
      try {
        const chunks: Buffer[] = [];
        let bytes = 0;
        for await (const chunk of stream) {
          const buffer = Buffer.from(chunk);
          if ((bytes += buffer.length) > MAX_PAGE_BYTES) throw new NoRecipeFound("Recipe page is too large.");
          chunks.push(buffer);
        }
        resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") });
      } catch (error) { request.destroy(); response.destroy(); decoder?.destroy(); reject(error); }
    });
    request.on("error", reject);
    request.end();
  });
}

async function resolveBeforeDeadline(promise: Promise<LookupAddress[]>, signal: AbortSignal) {
  return new Promise<LookupAddress[]>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then((value) => { signal.removeEventListener("abort", abort); resolve(value); },
      (error) => { signal.removeEventListener("abort", abort); reject(error); });
    if (signal.aborted) abort();
  });
}

/** Read only public HTML, checking and pinning DNS again for every redirect. */
export async function loadRecipePage(value: string, dependencies: PageDependencies = {}): Promise<string> {
  let url = new URL(normalizeRecipeUrl(value));
  const signal = AbortSignal.timeout(10_000);
  try {
    for (let redirects = 0; redirects <= 4; redirects++) {
      signal.throwIfAborted();
      const addresses = await resolveBeforeDeadline(
        (dependencies.resolve ?? ((host) => lookup(host, { all: true })))(url.hostname), signal,
      );
      if (!addresses.length || !addresses.every(({ address, family }) =>
        isIP(address) === family && publicRecipeAddress(address))) throw new Error();
      const page = await (dependencies.request ?? requestPage)(url, addresses, signal);
      if ([301, 302, 303, 307, 308].includes(page.status)) {
        if (!page.location || redirects === 4) throw new Error();
        url = new URL(normalizeRecipeUrl(new URL(page.location, url).href));
        continue;
      }
      if (page.status !== 200 || !/^(text\/html|application\/xhtml\+xml)(?:;|$)/i.test(page.contentType ?? "") ||
          !page.body || Buffer.byteLength(page.body) > MAX_PAGE_BYTES) throw new Error();
      return page.body;
    }
    throw new Error();
  } catch { throw new NoRecipeFound("The public recipe page could not be read."); }
}

/** Prefer recipe JSON-LD, keeping sections and excluding ads and article comments. */
export function recipePageContent(html: string, { providedByUser = false } = {}): string {
  const recipes: Record<string, unknown>[] = [];
  let remaining = 5000;
  const visit = (value: unknown, depth = 0): void => {
    if (--remaining < 0 || depth > 30 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1)); return; }
    const record = value as Record<string, unknown>;
    if (!providedByUser && (record.isAccessibleForFree === false ||
        (typeof record.isAccessibleForFree === "string" && record.isAccessibleForFree.toLowerCase() === "false"))) {
      throw new NoRecipeFound("This page requires a subscription.");
    }
    const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
    if (types.some((type) => typeof type === "string" && /(?:^|\/)Recipe$/.test(type))) {
      recipes.push(Object.fromEntries(["name", "description", "recipeIngredient", "recipeInstructions", "recipeYield", "recipeNotes"]
        .filter((key) => record[key] !== undefined).map((key) => [key, record[key]])));
      return;
    }
    Object.values(record).forEach((item) => visit(item, depth + 1));
  };
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\btype\s*=\s*["']?application\/ld\+json(?:["'\s]|$)/i.test(match[1]!)) continue;
    let data: unknown;
    try { data = JSON.parse(match[2]!); } catch { continue; }
    visit(data);
  }
  const readable = html
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<(script|style|nav|header|footer|form|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const text = (value: string) => value
    .replace(/<\/(?:p|div|li|h[1-6]|section|article)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/[\t ]+/g, " ").trim();
  // JSON-LD often flattens ingredient groups. Include visible lists and headings
  // so Gemini can preserve headings that are only present in the recipe card.
  const listsAndHeadings: string[] = [];
  let characters = 0;
  for (const match of readable.matchAll(/<(h[1-6]|ul|ol)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)) {
    const value = text(match[0]);
    if ((characters += value.length) > 30_000 || listsAndHeadings.length >= 40) break;
    listsAndHeadings.push(value);
  }
  const content = recipes.length ? JSON.stringify({ recipes, listsAndHeadings }) : text(readable);
  if (!content || content.length > 100_000) throw new NoRecipeFound("No usable recipe content was found.");
  return content;
}
