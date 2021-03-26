require('dotenv').config();

const fs = require('fs');
const path = require('path');
var electron_notarize = require('electron-notarize');
var package = require('./package.json');

module.exports = async function (params) {
  if (process.platform !== 'darwin') {
    return
  }

  console.log('afterSign hook triggered', params);

  let appId = package.build.appId
  if (!appId) {
    console.error("appId is missing from build configuration 'package.json'")
  }

  let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  console.log(`Notarizing ${appId} found at ${appPath}`);

  try {
    await electron_notarize.notarize({
      appBundleId: appId,
      appPath: appPath,
      appleApiKey: process.env.API_KEY_ID,
      appleApiIssuer: process.env.API_KEY_ISSUER_ID,
    });
  } catch (error) {
    console.error(error);
  }

  console.log(`Done notarizing ${appId}`);
};
