#!/usr/bin/env node
import { runPrompts } from './prompts.js'
import { scaffold } from './scaffold.js'
import { getDefaultOptions } from './defaults.js'

async function main() {
  const name = process.argv[2]
  const options = name ? getDefaultOptions(name) : await runPrompts()
  if (!options) process.exit(0)
  await scaffold(options)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
