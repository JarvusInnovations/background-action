const { defineConfig } = require("rolldown");

const config = defineConfig({
  input: "index.js",
  platform: "node",
  output: {
    dir: "dist",
    sourcemap: true,
    format: "cjs",
  },
});

module.exports = config;
