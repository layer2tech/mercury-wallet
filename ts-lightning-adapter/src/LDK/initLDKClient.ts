// import LightningClient from "./lightning.mjs";
let LDKClient;

async function importLDK(){
  console.log('Commence Import LDK...');
  // const { default: LightningClient } = await import("./lightning.mjs");
  const LightningClient = await import("./lightning.mjs");
  // LDKClient = new LightningClient();
  console.log("Lightning Client: ", LightningClient);
};

module.exports = { importLDK, LDKClient };