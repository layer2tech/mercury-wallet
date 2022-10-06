export const SuppressWarnings = require("suppress-warnings");
SuppressWarnings([
  (warning, name, ctor) =>
    name === "DeprecationWarning" &&
    warning.toString() ===
      "TransactionBuilder will be removed in the future. (v6.x.x or later) Please use the Psbt class instead.Examples of usage are available in the transactions - psbt.js integration test file on our Github.A high level explanation is available in the psbt.ts and psbt.js files as well.",
]);

export default SuppressWarnings;
