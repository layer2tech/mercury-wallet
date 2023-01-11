let LDKClient;
importLDK = async () => {
  const { default: LightningClient } = await import("./lightning.js");
  LDKClient = new LightningClient();
  console.log("Lightning Client: ", LightningClient);
};

module.exports = { importLDK, LDKClient };
