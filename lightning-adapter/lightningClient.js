let LDKClient;
startLDK = async () => {
  const { default: LightningClient } = await import("./lightning.mjs");
  LDKClient = new LightningClient();
  console.log("Lightning Client: ", LightningClient);
};

const getLDKClient = () => {
  if (!LDKClient) {
    throw new Error("LDKClient is not instantiated.");
  }
  return LDKClient;
};

module.exports = { startLDK, getLDKClient };
