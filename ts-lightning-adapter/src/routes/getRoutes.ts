import express from "express";
const router = express.Router();
import { closeConnections } from '../LDK/utils/ldk-utils.js';

router.get("/closeConnections", async function (req, res) {
  // Closing all connections
  closeConnections();
  res.status(200).json({ message: "Connections closed" });
});

export default router;
