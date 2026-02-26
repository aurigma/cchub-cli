/** @type {import('tsup').Options} */
module.exports = {
  entry: {
    "cchub-cli": "dist/index.js"
  },
  format: ["cjs"],
  platform: "node",
  target: "node18",
  bundle: true,
  noExternal: [/.*/],
  splitting: false,
  sourcemap: true,
  clean: false,
  dts: false,
  banner: {
    js: "#!/usr/bin/env node"
  }
};
