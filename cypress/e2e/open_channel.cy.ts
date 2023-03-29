describe("deposit coin", () => {
    it("should visit root page", () => {
        cy.visit("/");
    });
  
    it("should create a wallet and login.", () => {
        cy.login();
    });

    it("should click on Open Channel button and go to that page", () => {
        cy.get("[data-cy=home-header] .selection .image").click();
        cy.get(".filter-options label").eq(1).click();
        cy.get('body').click();
        cy.get("[data-cy=std-button]").contains("Open Channel").click();
    });

    it("check invalid inputs", () => {
        cy.get("[data-cy=create-channel]").contains("Create Channel").click();
        cy.get("[data-cy=custom-modal-info-alert-danger]")
            .contains("Please set the amount of the funding tx.");
        cy.get("[data-cy=custom-modal-info-btn-close]").click();
        
        cy.get("[data-cy=amt-input] input")
            .should("be.visible")
            .clear()
            .type("0.1");
        cy.get("[data-cy=create-channel]").contains("Create Channel").click();
        cy.get("[data-cy=custom-modal-info-alert-danger]")
            .contains("Please set the nodekey to open channel with peer");
        cy.get("[data-cy=custom-modal-info-btn-close]").click();
        
        cy.get("[data-cy=nodeid-input] input")
            .should("be.visible")
            .clear()
            .type("xyz");
        cy.get("[data-cy=create-channel]").contains("Create Channel").click();
        cy.get("[data-cy=custom-modal-info-alert-danger]")
            .contains("Please enter a valid nodekey address");
        cy.get("[data-cy=custom-modal-info-btn-close]").click();
        
        cy.get("[data-cy=nodeid-input] input")
            .should("be.visible")
            .clear()
            .type("025817585dc79c2fff719e764e30fdc28a5bda9d03e11a56b155bc4a243264d7cb@127.0.0.1:9937");
        cy.get("[data-cy=create-channel]").contains("Create Channel").click();
        cy.get("[data-cy=modal-close-confirm-btn]").contains("Confirm").click();
        cy.get("[data-cy=custom-modal-info-alert-danger]")
            .contains("The amount you have selected is below the minimum limit ( 1mBTC ). Please increase the amount to proceed with the transaction.");
        cy.get("[data-cy=custom-modal-info-btn-close]").click();
    });

    it("Open channel", () => {
        cy.get("[data-cy=amt-input] input")
            .should("be.visible")
            .clear()
            .type("1");
        cy.get("[data-cy=create-channel]").contains("Create Channel").click();
        cy.get("[data-cy=modal-close-confirm-btn]").contains("Confirm").click();
        cy.get("[data-cy=invoice] .deposit-scan-main-item").eq(0).contains("0.001 BTC");
        cy.get("[data-cy=invoice] .deposit-scan-main-item").eq(1).should('not.be.empty');
    })
});