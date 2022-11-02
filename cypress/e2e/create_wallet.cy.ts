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

    // click on testnet button
    cy.get("[data-cy=network-btn-testnet]").click();

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
});
