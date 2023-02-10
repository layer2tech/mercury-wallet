import dbmock from '../../test/db-mock';
import database from './database';

let db: any;
if (process.env["NODE_ENV"] === 'test') {
  db = dbmock;
} else {
  db = database;
}

export default db;