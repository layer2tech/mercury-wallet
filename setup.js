const fs = require("fs");
const path = require("path");

if (process.env.NODE_ENV === "development") {
  const webPackConfigFile = path.resolve(
    "./node_modules/react-scripts/config/webpack.config.js"
  );
  let webPackConfigFileText = fs.readFileSync(webPackConfigFile, "utf8");

  if (!webPackConfigFileText.includes("watchOptions")) {
    if (webPackConfigFileText.includes("performance: false,")) {
      webPackConfigFileText = webPackConfigFileText.replace(
        "performance: false,",
        "performance: false,\n\t\twatchOptions: { aggregateTimeout: 200, poll: 1000, ignored: '**/node_modules', },"
      );
      fs.writeFileSync(webPackConfigFile, webPackConfigFileText, "utf8");
    } else {
      throw new Error(`Failed to inject watchOptions`);
    }
  }
}
