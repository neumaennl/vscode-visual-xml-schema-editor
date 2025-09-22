const path = require("path");

module.exports = {
  entry: "./src/webview/index.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "webview.js",
    path: path.resolve(__dirname, "out", "webview"),
  },
};
