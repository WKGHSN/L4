const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "messages.db"));
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

const insertMessage = db.prepare(
  "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)"
);
const selectMessages = db.prepare(
  "SELECT id, name, email, message, created_at FROM messages ORDER BY id DESC"
);
const deleteMessageById = db.prepare("DELETE FROM messages WHERE id = ?");

function addMessage(name, email, message) {
  const result = insertMessage.run(name, email, message);
  return Number(result.lastInsertRowid);
}

function getMessages() {
  return selectMessages.all();
}

function deleteMessage(id) {
  return deleteMessageById.run(id).changes > 0;
}

module.exports = { addMessage, getMessages, deleteMessage };
