// loading wallets
describe("load wallet", () => {
  it("visit root page", () => {
    cy.visit("/");
  });

  it("should create a new wallet", () => {
    cy.login(); // this a new command (copies create_wallet.cy.ts) added to support/command.ts
  });

  it("should logout", () => {
    cy.get("[data-cy=exit-wallet-btn]").should("be.visible").click();
    cy.get("[data-cy=modal-close-confirm-btn]").should("be.visible").click();
  });

  it("should press load wallet", () => {
    cy.get("[data-cy=load-wallet-btn]").should("be.visible").click();
    cy.get("[data-cy=landing-continue-btn]").click();
  });

  it("should enter incorrect password and close modal", () => {
    cy.get("[data-cy=load-wallet-password-input]")
      .should("be.visible")
      .type("MercuryWallet2");
    cy.get("[data-cy=load-wallet-confirm-btn]").click();
    cy.get("[data-cy=custom-modal-info-alert-danger]").should("be.visible");
    cy.get("[data-cy=custom-modal-info-btn-close]")
      .should("be.visible")
      .click();
  });

  it("should press continue after entering password", () => {
    cy.get("[data-cy=load-wallet-password-input]")
      .should("be.visible")
      .clear()
      .type("MercuryWallet{enter}"); // {enter} is needed here as it is submitting a form (rather than pressing button directly as that bugs out)
  });
});
