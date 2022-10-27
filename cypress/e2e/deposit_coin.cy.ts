//Import dependencies

/*

const bip32 = require("bip32");
const bip39 = require("bip39");
const bitcoin = require("bitcoinjs-lib");
const axios = require("axios");
const bitcore = require("bitcore-lib");

//Define the network
const network = bitcoin.networks.testnet; //use networks.testnet for testnet

// Derivation path
const path = `m/49'/1'/0'/0`; // Use m/49'/1'/0'/0 for testnet

// testnet btc address:
// key:
let mnemonic = ""; // environment variables instead
const seed = bip39.mnemonicToSeedSync(mnemonic);
let root = bip32.fromSeed(seed, network);

let account = root.derivePath(path);
let node = account.derive(0).derive(0);

let btcAddress = bitcoin.payments.p2pkh({
  pubkey: node.publicKey,
  network: network,
}).address;

const sendBtc = async (account, depositAddress) => {
  console.log(await account.getBalance("BTC"));

  const txHash = await account
    .send(depositAddress, 0.001, "BTC")
    .on("transactionHash", console.log)
    // > "3387418aaddb4927209c5032f515aa442a6587d6e54677f08a03b8fa7789e688"
    .on("confirmation", console.log);
};*/

describe("deposit coin", () => {
  it("should visit root page", () => {
    cy.visit("/");
  });

  it("should create a wallet and login.", () => {
    cy.login();
  });

  it("should click on deposit button and go to deposit page", () => {
    cy.get("[data-cy=std-button]").contains("Deposit").click();
  });

  it("should check for network", () => {
    // make sure that we are connected before proceeding any further here...
  });

  it("should select a statecoin of 0.001 btc", () => {
    //cy.get("[data-cy=deposit-statecoins-numbers]").contains("0.001").click();
    //cy.get("[data-cy=deposit-statecoin-other]").should("be.visible").click();
    //cy.get("[data-cy=deposit-custom-input]").type("0.001");
    //cy.get("[data-cy=deposit-custom-confirm-btn]").click();
  });

  it("should generate a statecoin deposit of 0.001", () => {
    //cy.get("[data-cy=deposit-continue-btn]").click();
  });

  it("should get the deposit id address and pay the deposit", async () => {
    // TEST is commented out until can get private keys from github secrets
    /*
    cy.get("[data-cy=deposit-address]", { timeout: 10000 })
      .should("be.visible")
      .invoke("text")
      .then((depositAddress) => {
        console.log("deposit address found ->", depositAddress);

        console.log(`
        BTC Wallet loaded:

        - Address  : ${btcAddress},
        - Key : ${node.toWIF()}, 
        - Mnemonic : ${mnemonic}
            
        `);

        console.log("send bitcoins to deposit address -> ...", depositAddress);
        // use the testnet btc account above to send btc value to it.
        //sendBitcoin(depositAddress, 0.001);

        console.log("CryptoAccount ->");
        const CryptoAccount = require("send-crypto");
        const privateKey =
          "";
        const account = new CryptoAccount(privateKey, {
          network: "testnet",
        });

        console.log('"TIME TO SEND --->');
        console.log("cryptoaccount ->", CryptoAccount);
        console.log("account ->", account);
        sendBtc(account, depositAddress).then((e) => {
          console.log("E", e);
        });
      });
      */
  });

  it("should confirm the deposit", () => {});
});
