const express = require("express");
const router = express.Router();
const db = require("../database.js");

router.get("/closeConnections", async function (req, res) {
  // Closing all connections
  closeConnections();
});

module.exports = router;
