import sqlite from "sqlite3";
// import { createMockDatabase } from "../../test/db-mock";
import { createDatabase } from "./database";

let db: sqlite.Database | null = null; // Global variable to store the db object

export const getDatabase = async () => {
  if (db) {
    return db;
  }
  if (process.env["NODE_ENV"] === "test") {
    db = await createDatabase(); // todo: revert back to test
  } else {
    db = await createDatabase();
  }
  return db;
};
