const path = require("path");

module.exports = (_env, argv) => ({
  mode: argv.mode ?? "production",
  target: ["web", "es2020"],
  entry: "./src/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true,
  },
  devtool: argv.mode === "production" ? "source-map" : "eval-source-map",
  resolve: {
    extensions: [".ts", ".js"],
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "esbuild-loader",
        options: {
          target: "es2020",
        },
        exclude: /node_modules/,
      },
    ],
  },
});
