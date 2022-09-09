// File allows for override of webpack config.
const path = require("path");
const webpack = require("webpack");

module.exports = function override(config, env) {
  // add a dedicated loader for WASM
  config.module.rules.push({
    test: /\.wasm$/,
    type: "webassembly/sync",
  });

  config.resolve.fallback = {
    ...config.resolve.fallback,
    url: require.resolve("url"),
    crypto: false,
    http: false,
    https: false,
    os: false,
    buffer: false,
    stream: false,
    path: false,
    constants: false,
    fs: false,
  };

  config.experiments = {
    ...config.experiments,
    topLevelAwait: true,
    asyncWebAssembly: true,
    syncWebAssembly: true,
  };

  config.resolve.extensions = [...config.resolve.extensions, ".ts", ".js"];

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
  ]);

  config.ignoreWarnings = [/Failed to parse source map/];

  return config;
};
