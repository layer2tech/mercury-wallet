import database from "./database";
import dbmock from "../../test/db-mock";

let db: any;

if (process.env["NODE_ENV"] === "test") {
  db = dbmock;
} else {
  db = database;
}

export default db;