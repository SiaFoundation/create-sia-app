#!/usr/bin/env node

// src/prompts.ts
import crypto from "crypto";
import * as p from "@clack/prompts";
import pc from "picocolors";
async function runPrompts() {
  p.intro(pc.green("Create Sia App"));
  const projectName = await p.text({
    message: "What is your project name?",
    placeholder: "my-sia-app",
    validate(value) {
      if (!value.trim()) return "Project name is required";
      if (!/^[a-z0-9._-]+$/i.test(value.trim()))
        return "Use only letters, numbers, dashes, dots, and underscores";
    }
  });
  if (p.isCancel(projectName)) {
    p.cancel("Cancelled.");
    return null;
  }
  const keyChoice = await p.select({
    message: "App key setup",
    options: [
      {
        value: "generate",
        label: "Generate a new app key",
        hint: "Recommended"
      },
      { value: "existing", label: "Enter an existing app key" }
    ]
  });
  if (p.isCancel(keyChoice)) {
    p.cancel("Cancelled.");
    return null;
  }
  let appKey;
  if (keyChoice === "existing") {
    const existingKey = await p.text({
      message: "Enter your app key (64-char hex)",
      validate(value) {
        if (!/^[a-f0-9]{64}$/i.test(value.trim()))
          return "App key must be a 64-character hex string";
      }
    });
    if (p.isCancel(existingKey)) {
      p.cancel("Cancelled.");
      return null;
    }
    appKey = existingKey.trim();
  } else {
    appKey = crypto.randomBytes(32).toString("hex");
    p.log.info(`Generated app key: ${pc.cyan(appKey)}`);
  }
  const indexerUrl = await p.text({
    message: "Indexer URL",
    initialValue: "https://sia.storage"
  });
  if (p.isCancel(indexerUrl)) {
    p.cancel("Cancelled.");
    return null;
  }
  const appDescription = await p.text({
    message: "App description (optional)",
    placeholder: "My decentralized storage app",
    defaultValue: "A Sia storage app"
  });
  if (p.isCancel(appDescription)) {
    p.cancel("Cancelled.");
    return null;
  }
  return {
    projectName: projectName.trim(),
    appKey,
    indexerUrl: indexerUrl.trim(),
    appDescription: appDescription.trim() || "A Sia storage app"
  };
}

// src/scaffold.ts
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as p2 from "@clack/prompts";
import pc2 from "picocolors";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", "dist", ".git"]);
var BINARY_EXTENSIONS = /* @__PURE__ */ new Set([".wasm", ".png", ".jpg", ".ico", ".svg"]);
function findTemplateDir() {
  const published = path.resolve(__dirname, "..", "template");
  if (fs.existsSync(published)) return published;
  const local = path.resolve(__dirname, "..", "..", "..", "template");
  if (fs.existsSync(local)) return local;
  throw new Error("Could not find template directory");
}
function copyDir(src, dest, replacements) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    let destName = entry.name;
    if (destName === "_gitignore") destName = ".gitignore";
    const destPath = path.join(dest, destName);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, replacements);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        let content = fs.readFileSync(srcPath, "utf-8");
        for (const [search, replace] of replacements) {
          content = content.replaceAll(search, replace);
        }
        fs.writeFileSync(destPath, content);
      }
    }
  }
}
function detectPackageManager() {
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {
    return "npm";
  }
}
async function scaffold(options) {
  const { projectName, appKey, indexerUrl, appDescription } = options;
  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0) {
      p2.log.error(
        `Directory ${pc2.red(projectName)} already exists and is not empty.`
      );
      process.exit(1);
    }
  }
  const spinner2 = p2.spinner();
  spinner2.start("Creating project...");
  const templateDir = findTemplateDir();
  const replacements = [
    ["{{APP_NAME}}", projectName],
    ["{{APP_KEY}}", appKey],
    ["{{INDEXER_URL}}", indexerUrl],
    ["{{APP_DESCRIPTION}}", appDescription]
  ];
  copyDir(templateDir, targetDir, replacements);
  spinner2.message("Copied template files");
  const pm = detectPackageManager();
  spinner2.message(`Installing dependencies with ${pm}...`);
  try {
    execSync(`${pm} install`, { cwd: targetDir, stdio: "ignore" });
    spinner2.stop("Project created successfully");
  } catch {
    spinner2.stop("Project created (install failed \u2014 run manually)");
  }
  p2.note(
    [
      `${pc2.green("cd")} ${projectName}`,
      `${pc2.green(pm === "bun" ? "bun dev" : "npm run dev")}`
    ].join("\n"),
    "Next steps"
  );
  p2.outro(pc2.green("Happy building!"));
}

// src/defaults.ts
import crypto2 from "crypto";
function getDefaultOptions(projectName) {
  return {
    projectName,
    appKey: crypto2.randomBytes(32).toString("hex"),
    indexerUrl: "https://sia.storage",
    appDescription: "A Sia storage app"
  };
}

// src/index.ts
async function main() {
  const name = process.argv[2];
  const options = name ? getDefaultOptions(name) : await runPrompts();
  if (!options) process.exit(0);
  await scaffold(options);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
