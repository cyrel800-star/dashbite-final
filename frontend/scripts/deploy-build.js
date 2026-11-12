import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const buildRoot = resolve(projectRoot, "dist");
const builtIndex = resolve(buildRoot, "index.html");
const builtAssets = resolve(buildRoot, "assets", "build");
const deployedAssets = resolve(projectRoot, "assets", "build");

if (!existsSync(builtIndex) || !existsSync(builtAssets)) {
  throw new Error("Vite build output is incomplete; the XAMPP deployment was not updated.");
}

rmSync(deployedAssets, { recursive: true, force: true });
mkdirSync(resolve(projectRoot, "assets"), { recursive: true });
cpSync(builtAssets, deployedAssets, { recursive: true });
copyFileSync(builtIndex, resolve(projectRoot, "index.html"));

console.log("Deployed the React frontend to the XAMPP project root.");
