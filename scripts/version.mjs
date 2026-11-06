// 4 パッケージの version と、パッケージ間の依存(@yadeck/*)、create-slide の雛形の依存をまとめて上げる。
// 使い方: npm run release:version -- 0.1.1
import fs from "node:fs";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version ?? "")) {
  console.error("usage: npm run release:version -- <x.y.z>");
  process.exit(1);
}

const files = [
  "packages/slide-schema/package.json",
  "packages/slide-core/package.json",
  "packages/slide-components-basic/package.json",
  "packages/create-slide/package.json",
  "packages/create-slide/template/package.json",
];

for (const file of files) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!file.includes("/template/")) json.version = version;
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const name of Object.keys(json[field] ?? {})) {
      if (name.startsWith("@yadeck/")) json[field][name] = `^${version}`;
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`${file}: ${json.version ?? "(template)"}`);
}
