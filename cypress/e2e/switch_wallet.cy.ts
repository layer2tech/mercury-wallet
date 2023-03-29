describe("deposit coin", () => {
    it("should visit root page", () => {
      cy.visit("/");
    });
  
    it("should create a wallet and login.", () => {
      cy.login();
    });
  
    it("should check statecoin wallet and hide balance", () => {
      cy.get("[data-cy=wallet-balance] .main-header").contains("0 BTC");
      cy.get("[data-cy=wallet-balance] .sub-header").contains("0 Statecoins in Wallet");
      cy.get("[data-cy=balance-visibility] .toggle-switch").click();
      cy.get("[data-cy=wallet-balance] .main-header").contains("***** BTC");
      cy.get("[data-cy=wallet-balance] .sub-header").contains("***** Statecoins in Wallet");
    });

    it("should check lightning wallet and hide balance", () => {
      cy.get("[data-cy=home-header] .selection .image").click();
      cy.get(".filter-options label").eq(1).click();
      cy.get('body').click(); 
      cy.get("[data-cy=balance-visibility] .toggle-switch").click();
      cy.get("[data-cy=wallet-balance] .main-header").contains("0 sats");
      cy.get("[data-cy=wallet-balance] .sub-header").contains("0 Open channels");
      cy.get("[data-cy=balance-visibility] .toggle-switch").click();
      cy.get("[data-cy=wallet-balance] .main-header").contains("***** sats");
      cy.get("[data-cy=wallet-balance] .sub-header").contains("***** Open channels");
    });
  });