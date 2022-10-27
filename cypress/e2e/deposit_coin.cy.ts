describe("depositing a coin", () => {
  it("goes to root page", () => {
    cy.visit("/");
  });

  it("create & logins a walet", () => {
    cy.login();
  });
});
