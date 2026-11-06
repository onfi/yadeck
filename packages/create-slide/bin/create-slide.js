#!/usr/bin/env node
import { main } from "../dist/index.js";

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
