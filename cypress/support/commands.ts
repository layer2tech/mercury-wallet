import "@testing-library/cypress/add-commands";

Cypress.Commands.add("login", () => {
  cy.visit("/");
  cy.get("[data-cy=create-wallet-btn]").click();
  cy.get("[data-cy=landing-continue-btn]").click();
  cy.get("[data-cy=c-n-w-checkbox]").click();
  cy.get("[data-cy=c-n-w-continue-btn]").click();
  cy.get("[data-cy=cwf-wallet-name-input]")
    .should("be.visible")
    .type("MercuryWallet");

  cy.get("[data-cy=cwf-wallet-password-input]")
    .should("be.visible")
    .type("MercuryWallet");
  cy.get("[data-cy=cwf-wallet-password-repeat-input]")
    .should("be.visible")
    .type("MercuryWallet");
  cy.get("[data-cy=cwf-wallet-agreement-input]").should("be.visible").click();
  cy.get("[data-cy=cwf-wallet-create-btn]").click();
  cy.get("[data-cy=create-wallet-seed-btn-next]").should("be.visible").click();
  cy.get("[data-cy=create-wallet-confirm-seed-btn]")
    .should("be.visible")
    .click();
});
