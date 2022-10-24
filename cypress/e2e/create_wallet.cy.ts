describe("create wallet", () => {
  it("visit root page", () => {
    cy.visit("/");
  });

  it("get the create new wallet button", () => {
    cy.get("[data-cy=create-wallet-btn]");
  });

  it("main wallet section", () => {
    const landingTitle = "Welcome to Mercury";
    const landingMessage =
      "If you’re using Mercury wallet for the first time, create a new wallet. If you have an existing wallet, load the wallet from your device storage, or use your seed phrase or backup file to restore the wallet.";
    cy.get("[data-cy=mercury-landing-title]").contains(landingTitle);
    cy.get("[data-cy=mercury-landing-message]").contains(landingMessage);
    cy.get("[data-cy=welcome-btns-list]").children().should("have.length", 3);
  });

  it("should navigate to create menu", () => {
    // click on create wallet btn
    cy.get("[data-cy=create-wallet-btn]").click();

    // click on continue btn
    cy.get("[data-cy=landing-continue-btn]").click();

    const createNWTitle = "Create a New Wallet";
    const createNWImportant =
      "IMPORTANT: Wallet was opened in testnet, therefore new wallets will be created in testnet. Existing wallets are not changed.";
    const createNWAgreement =
      "I confirm that nobody can see my screen and take responsiblity of the security of this computer, because anyone who has access to my seed key will be able to spend the funds in my wallet.";

    // check that we are on the create wallet wizard by checking the contents of the page
    cy.get("[data-cy=create-new-wallet-title]").contains(createNWTitle);
    cy.get("[data-cy=create-new-wallet-important]").contains(createNWImportant);
    cy.get("[data-cy=create-new-wallet-agreement-txt]").contains(
      createNWAgreement
    );

    // check that there is a go back btn
    cy.get("[data-cy=c-n-w-go-back-btn]");

    cy.get("[data-cy=c-n-w-checkbox]").click();

    cy.get("[data-cy=c-n-w-continue-btn]").click();
  });

  it("should enter a wallet name and password", () => {
    cy.get("[data-cy=cwf-wallet-name-input]")
      .should("be.visible")
      .type("MercuryWallet");

    cy.get("[data-cy=cwf-wallet-password-input]")
      .should("be.visible")
      .type("MercuryWallet");
    cy.get("[data-cy=cwf-wallet-password-repeat-input]")
      .should("be.visible")
      .type("MercuryWallet");
  });

  it("should agree to the Terms of Use and press CREATE", () => {
    cy.get("[data-cy=cwf-wallet-agreement-input]").should("be.visible").click();
    cy.get("[data-cy=cwf-wallet-create-btn]").click();
  });

  it("should enter mnemonic page", () => {
    // verify things are on this page that should be here i.e the mnemonic key
  });

  it("should remember mnemonic and go to next page", () => {
    // since we are on testnet we don't need to - TODO - actually test this when not in testnet mode...

    cy.get("[data-cy=create-wallet-seed-btn-next]")
      .should("be.visible")
      .click();
  });

  it("should press confirm on final seed page", () => {
    cy.get("[data-cy=create-wallet-confirm-seed-btn]")
      .should("be.visible")
      .click();
  });
});
