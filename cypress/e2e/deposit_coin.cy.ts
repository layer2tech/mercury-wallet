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

  it("should check for network", () => {});

  it("should generate a new coin", () => {});
});
