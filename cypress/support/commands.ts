import "@testing-library/cypress/add-commands";

let diffIndexes: any = [];
function arrayDiff(a, b) {
  return a.filter(function (i) {
    if (b.indexOf(i) < 0) {
      diffIndexes.push(a.indexOf(i));
      return true;
    } else {
      return false;
    }
  });
}

Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

Cypress.Commands.add("login", () => {
  cy.visit("/");
  cy.get("[data-cy=create-wallet-btn]").click();
  cy.get("[data-cy=landing-continue-btn]").click();
  cy.get("[data-cy=network-btn-testnet]").click();
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

  cy.get("[data-cy=seed-phrase]")
    .get("input")
    .then(($els) => {
      let texts = Array.from($els, (el) => el.placeholder);
      console.log(texts); //Your array

      cy.get("[data-cy=create-wallet-seed-btn-next]")
        .should("be.visible")
        .click();

      cy.get("[data-cy=confirm-seed]")
        .get("input")
        .then(($els2) => {
          let texts2 = Array.from($els2, (el2) => el2.placeholder);
          var diffValues = arrayDiff(texts2, texts);
          for (var i = 0; i < 3; i++) {
            cy.get("[data-cy=confirm-seed]")
              .get("input")
              .eq(diffIndexes[i])
              .type(texts[diffIndexes[i]]);
          }

          cy.get("[data-cy=create-wallet-confirm-seed-btn]")
            .should("be.visible")
            .click();
        });
    });
});
