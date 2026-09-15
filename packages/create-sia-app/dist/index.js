#!/usr/bin/env node

// src/defaults.ts
import crypto from "node:crypto";
function getDefaultOptions(projectName) {
  return {
    projectName,
    appId: crypto.randomBytes(32).toString("hex"),
    indexerUrl: "https://sia.storage",
    appDescription: "A Sia storage app"
  };
}

// src/prompts.ts
import crypto2 from "node:crypto";
import * as p from "@clack/prompts";
import pc from "picocolors";
function isCancelled(value) {
  return p.isCancel(value);
}
function validateProjectName(value) {
  const name = value?.trim() ?? "";
  if (!name)
    return "Project name is required";
  if (!/^[a-z0-9._-]+$/i.test(name))
    return "Use only letters, numbers, dashes, dots, and underscores";
  return;
}
function validateAppId(value) {
  if (!/^[a-f0-9]{64}$/i.test(value?.trim() ?? ""))
    return "App ID must be a 64-character hex string";
  return;
}
async function runPrompts() {
  p.intro(pc.green("Create Sia App"));
  const projectName = await p.text({
    message: "What is your project name?",
    placeholder: "my-sia-app",
    validate: validateProjectName
  });
  if (isCancelled(projectName)) {
    p.cancel("Cancelled.");
    return null;
  }
  const keyChoice = await p.select({
    message: "App ID",
    options: [
      {
        value: "generate",
        label: "Generate a new app ID",
        hint: "Recommended"
      },
      { value: "existing", label: "Enter an existing app ID" }
    ]
  });
  if (isCancelled(keyChoice)) {
    p.cancel("Cancelled.");
    return null;
  }
  let appId;
  if (keyChoice === "existing") {
    const existingId = await p.text({
      message: "Enter your app ID (64-char hex)",
      validate: validateAppId
    });
    if (isCancelled(existingId)) {
      p.cancel("Cancelled.");
      return null;
    }
    appId = existingId.trim();
  } else {
    appId = crypto2.randomBytes(32).toString("hex");
    p.log.info(`Generated app ID: ${pc.cyan(appId)}`);
  }
  const indexerUrl = await p.text({
    message: "Indexer URL",
    initialValue: "https://sia.storage"
  });
  if (isCancelled(indexerUrl)) {
    p.cancel("Cancelled.");
    return null;
  }
  const appDescription = await p.text({
    message: "App description (optional)",
    placeholder: "My decentralized storage app",
    defaultValue: "A Sia storage app"
  });
  if (isCancelled(appDescription)) {
    p.cancel("Cancelled.");
    return null;
  }
  return {
    projectName: projectName.trim(),
    appId,
    indexerUrl: indexerUrl.trim(),
    appDescription: appDescription.trim() || "A Sia storage app"
  };
}

// src/scaffold.ts
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as p2 from "@clack/prompts";
import pc2 from "picocolors";
var __dirname2 = path.dirname(fileURLToPath(import.meta.url));
var SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);
var BINARY_EXTENSIONS = new Set([".wasm", ".png", ".jpg", ".ico", ".svg"]);
function findTemplateDir() {
  const published = path.resolve(__dirname2, "..", "template");
  if (fs.existsSync(published))
    return published;
  const local = path.resolve(__dirname2, "..", "..", "..", "template");
  if (fs.existsSync(local))
    return local;
  throw new Error("Could not find template directory");
}
function copyDir(src, dest, replacements) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name))
      continue;
    if (AGENT_GUIDE_LINKS.includes(entry.name))
      continue;
    const srcPath = path.join(src, entry.name);
    let destName = entry.name;
    if (destName === "_gitignore")
      destName = ".gitignore";
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
var AGENT_GUIDE_LINKS = ["CLAUDE.md"];
function linkAgentGuides(dest) {
  for (const name of AGENT_GUIDE_LINKS) {
    const linkPath = path.join(dest, name);
    try {
      fs.symlinkSync("AGENTS.md", linkPath);
    } catch {
      fs.copyFileSync(path.join(dest, "AGENTS.md"), linkPath);
    }
  }
}
function escapeSingleQuoted(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
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
  const { projectName, appId, indexerUrl, appDescription } = options;
  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0) {
      p2.log.error(`Directory ${pc2.red(projectName)} already exists and is not empty.`);
      process.exit(1);
    }
  }
  const spinner2 = p2.spinner();
  spinner2.start("Creating project...");
  const templateDir = findTemplateDir();
  const replacements = [
    ["{{APP_NAME}}", projectName],
    ["{{APP_ID}}", appId],
    ["{{INDEXER_URL}}", escapeSingleQuoted(indexerUrl)],
    ["{{APP_DESCRIPTION}}", escapeSingleQuoted(appDescription)]
  ];
  copyDir(templateDir, targetDir, replacements);
  linkAgentGuides(targetDir);
  spinner2.message("Copied template files");
  const pm = detectPackageManager();
  spinner2.message(`Installing dependencies with ${pm}...`);
  try {
    execSync(`${pm} install`, { cwd: targetDir, stdio: "ignore" });
  } catch {
    spinner2.stop(`Project created, but ${pm} install failed. Run it yourself.`);
    nextSteps(projectName, pm);
    return;
  }
  try {
    execSync(`${pm} run fmt`, { cwd: targetDir, stdio: "ignore" });
    spinner2.stop("Project created successfully");
  } catch {
    spinner2.stop(`Project created, but formatting failed. Run ${pm} run fmt.`);
  }
  nextSteps(projectName, pm);
}
function nextSteps(projectName, pm) {
  p2.note([
    `${pc2.green("cd")} ${projectName}`,
    `${pc2.green(pm === "bun" ? "bun dev" : "npm run dev")}`
  ].join(`
`), "Next steps");
  p2.outro(pc2.green("Happy building!"));
}

// src/index.ts
async function main() {
  const name = process.argv[2];
  const options = name ? getDefaultOptions(name) : await runPrompts();
  if (!options)
    process.exit(0);
  await scaffold(options);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
