describe("create lightning wallet", () => {
  it("visit root page", () => {
    cy.visit("/");
  });

  it("should create wallet and login", () => {
    cy.login();
  });
});
