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
    crypto: require.resolve("crypto-browserify"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify/browser"),
    buffer: require.resolve("buffer"),
    stream: require.resolve("stream-browserify"),
    path: require.resolve("path-browserify"),
    constants: require.resolve("constants-browserify"),
    fs: false,
  };

  config.experiments = {
    ...config.experiments,
    topLevelAwait: true,
    asyncWebAssembly: true,
    syncWebAssembly: true,
  };

  config.resolve.extensions = [...config.resolve.extensions, ".ts", ".js"];

  config.plugins.push(
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    })
  );

  return config;
};
