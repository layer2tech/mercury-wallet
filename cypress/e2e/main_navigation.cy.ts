describe("Main navigation", () => {
  it("visits root", () => {
    cy.visit("/");
  });

  it("creates a wallet and loads it", () => {
    cy.login();
  });

  it("checks a header exists and the contents within the header", () => {
    cy.get("[data-cy=Header]").should("be.visible");

    // check the colour of this header
    cy.get("[data-cy=Header]").should(
      "have.css",
      "background-color",
      "rgb(0, 84, 244)"
    );

    // check that there is a mercury wallet logo on the header
    cy.get("[data-cy=Header-logo]").should("be.visible");

    // check the height and width of the logo
    cy.get("[data-cy=Header-logo]").should("have.css", "width", "115px");
    cy.get("[data-cy=Header-logo]").should("have.css", "height", "38px");

    // check for a tor/i2p icon
    cy.get("[data-cy=network-switch]").should("be.visible");

    // check for a dark/light mode switch
    cy.get("[data-cy=toggle-switch-theme]").should("be.visible");

    // check for a help button
    cy.get("[data-cy=Header-help]").should("be.visible");

    // check for a settings button
    cy.get("[data-cy=Header-settings]").should("be.visible");

    // check for a logout button
    cy.get("[data-cy=exit-wallet-btn]").should("be.visible");
  });

  it("checks main panel", () => {
    cy.get("[data-cy=Body-panelControl]").should("be.visible");
    cy.get("[data-cy=Body-panelControl]").should(
      "have.css",
      "background-color",
      "rgb(255, 255, 255)"
    );

    // should be 3 child elements under this
    cy.get("[data-cy=container-home-page]").children().should("have.length", 3);

    // get the body panel
    cy.get("[data-cy=Body-panelControl]").should("be.visible");
    cy.get("[data-cy=Body-panelControl]").children().should("have.length", 2);

    // the balance should contain the text
    cy.get("[data-cy=home-header-balance]")
      .should("be.visible")
      .contains("Statecoins in Wallet");

    cy.get("[data-cy=checkbox-toggle-label]")
      .should("be.visible")
      .contains("Hide balance");

    // Check that there is 5 std buttons
    cy.get("[data-cy=std-button]").children().should("have.length", 5);

    // check for deposit button exists and that it is orange colour background with white text
    cy.get("[data-cy=std-button]")
      .contains("Deposit")
      .should("have.css", "background-color", "rgb(247, 147, 26)")
      .should("have.css", "color", "rgb(255, 255, 255)");

    // same for withdraw
    cy.get("[data-cy=std-button]")
      .contains("Withdraw")
      .should("have.css", "background-color", "rgb(247, 147, 26)")
      .should("have.css", "color", "rgb(255, 255, 255)");

    // check that swap, send recv are blue background with whtie text
    cy.get("[data-cy=std-button]")
      .contains("Swap")
      .should("have.css", "background-color", "rgb(0, 84, 244)")
      .should("have.css", "color", "rgb(255, 255, 255)");

    cy.get("[data-cy=std-button]")
      .contains("Send")
      .should("have.css", "background-color", "rgb(0, 84, 244)")
      .should("have.css", "color", "rgb(255, 255, 255)");

    cy.get("[data-cy=std-button]")
      .contains("Receive")
      .should("have.css", "background-color", "rgb(0, 84, 244)")
      .should("have.css", "color", "rgb(255, 255, 255)");
  });

  it("checks connection panel ", () => {
    // Check the connection text
    cy.get("[data-cy=connection-wrap]").should("be.visible");

    // check that there are 3 radio buttons
    cy.get("[data-cy=connection-radio-button]")
      .should("be.visible")
      .children()
      .should("have.length", 3);

    // check that the text exists
    cy.get("[data-cy=connection-radio-button]").contains(
      "Connecting to Server"
    );
    cy.get("[data-cy=connection-radio-button]").contains("Connecting to Swaps");
    cy.get("[data-cy=connection-radio-button]").contains(
      "Connecting to Bitcoin"
    );

    // click on the panel to expand it
    cy.get("[data-cy=image-rotate-dropdown]").should("be.visible").click();

    // check the text of expanded panel
    cy.get("[data-cy=host-server]").should("be.visible");

    // Connection to Server
    cy.get("[data-cy=host-server-host]").contains("Host:");
    cy.get("[data-cy=host-server-deposit-fee]").contains("Deposit Fee:");
    cy.get("[data-cy=host-server-host-withdraw-fee]").contains("Withdraw Fee:");
    cy.get("[data-cy=host-server-host-ping]").contains("Ping:");

    // Connection to Swaps
    cy.get("[data-cy=host-swaps-host]").contains("Host:");
    cy.get("[data-cy=host-swaps-pending-swaps]").contains("Pending Swaps:");
    cy.get("[data-cy=host-swaps-participants]").contains("Participants:");
    cy.get("[data-cy=host-swaps-pooled-btc]").contains("Total pooled BTC:");
    cy.get("[data-cy=host-swaps-ping]").contains("Ping:");

    // Connection to Bitcoin
    cy.get("[data-cy=block-height]").contains("Block height:");
    cy.get("[data-cy=host-btc]").contains("Host:");
    cy.get("[data-cy=host-btc-port]").contains("Port:");
    cy.get("[data-cy=host-btc-protocol]").contains("Protocol:");
    cy.get("[data-cy=host-btc-ping]").contains("Ping:");
  });

  it("checks lower panel with coins/activity", () => {
    cy.get("[data-cy=panel-coins-activity]").should("be.visible");

    cy.get("[data-cy=coins-panel]").contains("STATECOINS");
    cy.get("[data-cy=coins-panel]").contains("ACTIVITY");

    // check panel underneath statecoins
    cy.get("[data-cy=empty-coin-list]").should("be.visible");
    cy.get("[data-cy=empty-coin-list-img]").should("be.visible");
    cy.get("[data-cy=empty-coin-list-img]").should("have.css", "width", "30px");
    cy.get("[data-cy=empty-coin-list-img]").should(
      "have.css",
      "height",
      "30px"
    );

    cy.get("[data-cy=empty-coin-list-deposit-btc]")
      .should("be.visible")
      .contains("Your wallet is empty");

    cy.get("[data-cy=empty-coin-list-deposit]")
      .should("be.visible")
      .contains("Deposit BTC");

    cy.get("[data-cy=empty-coin-list-message]").contains(
      "to create new Statecoin UTXO's"
    );

    // click on activity panel
    cy.get("[data-cy=coins-panel]").contains("ACTIVITY").click();

    // check text changed
    cy.get("[data-cy=empty-coin-list-deposit-btc]")
      .should("be.visible")
      .contains("No activity recorded.");
    cy.get("[data-cy=empty-coin-list-deposit]")
      .should("be.visible")
      .contains("Deposit BTC");

    cy.get("[data-cy=empty-coin-list-message]").contains(
      "to create new Statecoin UTXO's"
    );

    // change back to STATECOINS panel and verify everything is the same
    cy.get("[data-cy=coins-panel]").contains("STATECOINS").click();
    cy.get("[data-cy=empty-coin-list-deposit-btc]")
      .should("be.visible")
      .contains("Your wallet is empty");

    cy.get("[data-cy=empty-coin-list-deposit]")
      .should("be.visible")
      .contains("Deposit BTC");

    cy.get("[data-cy=empty-coin-list-message]").contains(
      "to create new Statecoin UTXO's"
    );

    // check filter by icon
    cy.get("[data-cy=filter-coin-icon]").should("be.visible");
  });

  it("should click on hide balance toggle", () => {
    cy.get("[data-cy=toggle-checkbox]").click();

    // check text changed to 'Show balance'
    cy.get("[data-cy=checkbox-toggle-label]")
      .should("be.visible")
      .contains("Show balance");
  });

  it("should click on the dark/light mode toggle", () => {
    // switch to dark mode
    cy.get("[data-cy=toggle-switch-theme]").should("be.visible").click();

    // check colour changed of header
    cy.get("[data-cy=Header]").should(
      "have.css",
      "background-color",
      "rgb(11, 43, 104)"
    );

    // check colour of body
    cy.get("[data-cy=Body-panelControl]").should(
      "have.css",
      "background-color",
      "rgb(32, 32, 32)"
    );

    // change back to light mode
    cy.get("[data-cy=toggle-switch-theme]").should("be.visible").click();

    // verify colours are the back to light
    cy.get("[data-cy=Header]").should(
      "have.css",
      "background-color",
      "rgb(0, 84, 244)"
    );
    cy.get("[data-cy=Body-panelControl]").should(
      "have.css",
      "background-color",
      "rgb(255, 255, 255)"
    );
  });
});
