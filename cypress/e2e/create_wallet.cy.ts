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
});
