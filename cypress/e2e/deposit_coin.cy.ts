describe("deposit coin", () => {
  it("should create a wallet, login and deposit a coin", () => {
    cy.login();
    cy.get("[data-cy=std-button]").contains("Deposit").click();
    cy.get(":nth-child(1) > [data-cy=valueSelection-btn]").click();
    cy.get("[data-cy=deposit-continue-btn]").click();
  });
});