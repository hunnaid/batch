import { expect, test } from "bun:test";
import { loadRecipePage, pinnedRecipeLookup, publicRecipeAddress, recipePageContent } from "../src/recipe-page.ts";
import { NoRecipeFound } from "../src/recipe-import-errors.ts";

const url = "https://recipes.example.com/cake";
const addresses = [{ address: "8.8.8.8", family: 4 }];
const html = "<html><h1>Cake</h1></html>";

test("only public IP addresses are eligible for recipe connections", () => {
  for (const address of ["8.8.8.8", "1.1.1.1", "2001:4860:4860::8888"]) expect(publicRecipeAddress(address)).toBe(true);
  for (const address of ["127.0.0.1", "0.0.0.0", "10.0.0.1", "172.20.0.1", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "198.18.0.1", "192.0.2.1", "224.0.0.1", "255.255.255.255", "::1", "::ffff:127.0.0.1",
    "fd00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::", "invalid"]) expect(publicRecipeAddress(address)).toBe(false);
});

test("private, mixed, empty and invalid DNS results are refused before making a connection", async () => {
  let connections = 0;
  for (const resolved of [[], [{ address: "127.0.0.1", family: 4 }], [...addresses, { address: "10.0.0.1", family: 4 }],
    [{ address: "8.8.8.8", family: 6 }]]) {
    await expect(loadRecipePage(url, { resolve: async () => resolved,
      request: async () => { connections++; return { status: 200, contentType: "text/html", body: html }; },
    })).rejects.toBeInstanceOf(NoRecipeFound);
  }
  expect(connections).toBe(0);
});

test("the connection uses its validated DNS answer without resolving the hostname again", async () => {
  let resolutions = 0;
  expect(await loadRecipePage(url, {
    resolve: async () => ++resolutions === 1 ? addresses : [{ address: "127.0.0.1", family: 4 }],
    request: async (destination, resolved, signal) => {
      expect(destination.href).toBe(url);
      expect(signal.aborted).toBe(false);
      const pinned = pinnedRecipeLookup(resolved);
      pinned(destination.hostname, {}, (error, address, family) => {
        expect(error).toBeNull(); expect(address).toBe("8.8.8.8"); expect(family).toBe(4);
      });
      pinned(destination.hostname, { all: true }, (error, values) => {
        expect(error).toBeNull(); expect(values).toEqual(addresses);
      });
      return { status: 200, contentType: "text/html; charset=utf-8", body: html };
    },
  })).toBe(html);
  expect(resolutions).toBe(1);
});

test("redirects are followed only after validating the new destination", async () => {
  const visited: string[] = [];
  expect(await loadRecipePage(url, { resolve: async () => addresses, request: async (destination) => {
    visited.push(destination.href);
    return visited.length === 1 ? { status: 301, location: "/cake/" } : { status: 200, contentType: "text/html", body: html };
  } })).toBe(html);
  expect(visited).toEqual([url, `${url}/`]);
  for (const location of ["http://127.0.0.1/admin", "https://internal.example.com/secret", "file:///etc/passwd"]) {
    let connections = 0;
    await expect(loadRecipePage(url, {
      resolve: async (host) => host === "internal.example.com" ? [{ address: "169.254.169.254", family: 4 }] : addresses,
      request: async () => { connections++; return { status: 302, location }; },
    })).rejects.toBeInstanceOf(NoRecipeFound);
    expect(connections).toBe(1);
  }
});

test("failed responses, non-HTML, excessive bodies and redirect loops are refused", async () => {
  for (const page of [{ status: 401 }, { status: 403 }, { status: 404 }, { status: 200, contentType: "application/json", body: "{}" },
    { status: 200, contentType: "text/html", body: "x".repeat(2 * 1024 * 1024 + 1) }]) {
    await expect(loadRecipePage(url, { resolve: async () => addresses, request: async () => page })).rejects.toBeInstanceOf(NoRecipeFound);
  }
  let connections = 0;
  await expect(loadRecipePage(url, { resolve: async () => addresses, request: async () => {
    connections++; return { status: 302, location: "/loop" };
  } })).rejects.toBeInstanceOf(NoRecipeFound);
  expect(connections).toBe(5);
});

test("recipe JSON-LD preserves ingredient order and instruction sections while excluding unrelated data", () => {
  const recipe = { "@type": ["Recipe"], name: "Cake", recipeIngredient: ["Flour", "Cocoa"],
    recipeInstructions: [{ "@type": "HowToSection", name: "Cake", itemListElement: [{ "@type": "HowToStep", text: "Bake." }] }],
    author: "Not recipe content", unrelated: "Ignore this" };
  const content = recipePageContent(`<nav>Advertising</nav><script type="application/ld+json">${JSON.stringify({
    "@graph": [{ "@type": "WebSite", name: "Website" }, recipe],
  })}</script><h4>Cake ingredients</h4><ul><li>Flour</li><li>Cocoa</li></ul><p>Reader comments</p>`);
  expect(JSON.parse(content)).toEqual({ recipes: [{ name: "Cake", recipeIngredient: recipe.recipeIngredient, recipeInstructions: recipe.recipeInstructions }],
    listsAndHeadings: ["Cake ingredients", "Flour\n Cocoa"] });
  expect(content).not.toContain("Reader comments");
  expect(content).not.toContain("author");
});

test("pages without JSON-LD use readable HTML, while declared paywalls and excessive content are refused", () => {
  const content = recipePageContent('<script>Bad instructions</script><nav>Ads</nav><h1>Cake</h1><ul><li>Flour</li><li>Cocoa</li></ul><p>Bake.</p>');
  expect(content).toContain("Cake"); expect(content).toContain("Flour"); expect(content).toContain("Bake.");
  expect(content).not.toContain("Bad instructions"); expect(content).not.toContain("Ads");
  for (const isAccessibleForFree of [false, "False", "false"]) {
    expect(() => recipePageContent(`<script type="application/ld+json">${JSON.stringify({
      "@type": "Recipe", isAccessibleForFree, name: "Private cake",
    })}</script>`)).toThrow(NoRecipeFound);
  }
  expect(() => recipePageContent("x".repeat(100_001))).toThrow(NoRecipeFound);
});
