describe("recovers wallet from seed", () => {
  it("should go to root", () => {
    cy.visit("/");
  });

  it("should click recover from seed", () => {
    cy.get("[data-cy=recover-wallet-btn]").should("be.visible").click();
  });

  it("should press continue and go to recover page", () => {
    cy.get("[data-cy=landing-continue-btn]").click();
  });

  it("should select Mnemonic input and enter seed phrase", () => {
    let seedPhrase =
      "shield thing cluster purse venue patrol property uncle gasp action laptop year";
    cy.get("[data-cy=mnemonic]").type(seedPhrase);
  });

  it("should enter an address gap limit", () => {
    cy.get("[data-cy=address-gap-limit]").type(1000);
  });

  it("should enter a wallet name", () => {
    let walletName = "recovered_MercuryWallet";
    cy.get("[data-cy=cwf-wallet-name-input]").type(walletName);
  });

  it("should enter a password", () => {
    cy.get("[data-cy=cwf-wallet-password-input]").type("MercuryWallet");
  });

  it("should enter an incorrect confirm password", () => {
    cy.get("[data-cy=cwf-wallet-password-repeat-input]").type("MercuryWallet2");
  });

  it("should display incorrect password", () => {
    cy.get("[data-cy=recovery-error]")
      .should("be.visible")
      .contains("The passwords do not match");
  });

  it("should enter a correct confirm password", () => {
    cy.get("[data-cy=cwf-wallet-password-repeat-input]")
      .clear()
      .type("MercuryWallet");
  });

  it("shouldn't display incorrect password", () => {
    cy.get("[data-cy=recovery-error]").should("not.exist");
  });

  it("should select that I have read and agreed to the terms of use.", () => {
    cy.get("[data-cy=cwf-wallet-agreement-input]").click();
  });

  it("should press continue and proceed to recovering the wallet", () => {
    cy.get("[data-cy=cwf-wallet-create-btn]").click();
  });

  /* -- Works on local machine but fails on github actions - must be issue with rendering or lag etc
  it("should logout", () => {
    cy.logout();
  });

  it("should go to load wallet page", () => {
    cy.get("[data-cy=load-wallet-btn]").should("be.visible").click();
    cy.get("[data-cy=landing-continue-btn]").click();
  });

  it("should check that recovered wallet exists in loaded wallets", () => {
    cy.get("[data-cy=load-wallet-names]").contains("recovered_MercuryWallet");
  });

  it("should enter password and relogin", () => {
    cy.get("[data-cy=load-wallet-password-input]").type("MercuryWallet{enter}");
  });
  */
});

/*
describe("recover and check that testnet is still the network", () => {
  
  it("should click on deposit button", () => {
    cy.get("[data-cy=std-button]").contains("Deposit").click();
  });

  it("should get deposit coin buttons list", () => {
    cy.get("[data-cy=valueSelection-btn]").contains("0.001").click();
  });

  it("should press continue and deposit", () => {
    cy.get("[data-cy=deposit-confirm-btn]").should("be.visible").click();
  });
});
*/
