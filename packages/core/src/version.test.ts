import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { VERSION } from "./version.js";

test("VERSION matches the published manifest", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  expect(VERSION).toBe(pkg.version);
});
