const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.resolve(__dirname, "database.sqlite"),
  (err) => {
    if (err) console.error("Database error:", err);
    else console.log("Connected to SQLite.");
  }
);

module.exports = db;