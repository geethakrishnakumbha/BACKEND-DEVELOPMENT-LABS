const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
app.use(express.json());

const dbPath = process.env.DB_PATH || path.join(__dirname, "database", "books.db");
let db;
const PORT = process.env.PORT || 3000;

const allowedSortColumns = new Set(["id", "title", "author", "price", "pages"]);

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function validateBook(body) {
  const { title, author, price, pages } = body || {};
  if (typeof title !== "string" || !title.trim()) {
    return "Title is required and must be a non-empty string.";
  }
  if (typeof author !== "string" || !author.trim()) {
    return "Author is required and must be a non-empty string.";
  }
  if (price === undefined || price === null || price === "" || !Number.isFinite(Number(price))) {
    return "Price is required and must be a number.";
  }
  if (Number(price) < 0) {
    return "Price must be zero or greater.";
  }
  if (pages === undefined || pages === null || pages === "" || !Number.isInteger(Number(pages)) || Number(pages) <= 0) {
    return "Pages is required and must be a positive integer.";
  }
  return null;
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function initializeDatabase() {
  db = await open({ filename: dbPath, driver: sqlite3.Database });
}

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to the Book Management API (Lab 3)." });
});

// GET /books supports search, sorting, pagination and a price range.
app.get("/books", asyncHandler(async (req, res) => {
  const {
    search_q = "",
    order_by = "id",
    order = "ASC",
    limit = "10",
    offset = "0",
    min_price,
    max_price
  } = req.query;

  if (!allowedSortColumns.has(String(order_by))) {
    return res.status(400).json({ message: "Invalid order_by. Allowed values: id, title, author, price, pages." });
  }
  const normalizedOrder = String(order).toUpperCase();
  if (!["ASC", "DESC"].includes(normalizedOrder)) {
    return res.status(400).json({ message: "Invalid order. Use ASC or DESC." });
  }
  if (!/^\d+$/.test(String(limit)) || Number(limit) < 1 || Number(limit) > 100) {
    return res.status(400).json({ message: "Limit must be an integer between 1 and 100." });
  }
  if (!/^\d+$/.test(String(offset))) {
    return res.status(400).json({ message: "Offset must be a non-negative integer." });
  }
  if (min_price !== undefined && (min_price === "" || !Number.isFinite(Number(min_price)) || Number(min_price) < 0)) {
    return res.status(400).json({ message: "min_price must be a non-negative number." });
  }
  if (max_price !== undefined && (max_price === "" || !Number.isFinite(Number(max_price)) || Number(max_price) < 0)) {
    return res.status(400).json({ message: "max_price must be a non-negative number." });
  }
  if (min_price !== undefined && max_price !== undefined && Number(min_price) > Number(max_price)) {
    return res.status(400).json({ message: "min_price cannot be greater than max_price." });
  }

  const conditions = [];
  const params = [];
  if (String(search_q).trim()) {
    conditions.push("title LIKE ?");
    params.push(`%${String(search_q).trim()}%`);
  }
  if (min_price !== undefined) {
    conditions.push("price >= ?");
    params.push(Number(min_price));
  }
  if (max_price !== undefined) {
    conditions.push("price <= ?");
    params.push(Number(max_price));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  // Column and direction are allow-listed above; all user values remain bound parameters.
  const sql = `SELECT id, title, author, price, pages FROM book ${whereClause} ORDER BY ${order_by} ${normalizedOrder} LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));
  const books = await db.all(sql, params);
  res.status(200).json({ count: books.length, books });
}));

app.get("/books/:bookId", asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  if (!isPositiveInteger(bookId)) return res.status(400).json({ message: "bookId must be a positive integer." });
  const book = await db.get("SELECT id, title, author, price, pages FROM book WHERE id = ?", [Number(bookId)]);
  if (!book) return res.status(404).json({ message: "Book not found." });
  res.status(200).json(book);
}));

app.post("/books", asyncHandler(async (req, res) => {
  const validationError = validateBook(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const { title, author, price, pages } = req.body;
  const result = await db.run(
    "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)",
    [title.trim(), author.trim(), Number(price), Number(pages)]
  );
  const createdBook = await db.get("SELECT id, title, author, price, pages FROM book WHERE id = ?", [result.lastID]);
  res.status(201).json({ message: "Book created successfully.", book: createdBook });
}));

app.put("/books/:bookId", asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  if (!isPositiveInteger(bookId)) return res.status(400).json({ message: "bookId must be a positive integer." });
  const validationError = validateBook(req.body);
  if (validationError) return res.status(400).json({ message: validationError });
  const existingBook = await db.get("SELECT id FROM book WHERE id = ?", [Number(bookId)]);
  if (!existingBook) return res.status(404).json({ message: "Book not found." });
  const { title, author, price, pages } = req.body;
  await db.run(
    "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?",
    [title.trim(), author.trim(), Number(price), Number(pages), Number(bookId)]
  );
  const updatedBook = await db.get("SELECT id, title, author, price, pages FROM book WHERE id = ?", [Number(bookId)]);
  res.status(200).json({ message: "Book updated successfully.", book: updatedBook });
}));

app.delete("/books/:bookId", asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  if (!isPositiveInteger(bookId)) return res.status(400).json({ message: "bookId must be a positive integer." });
  const existingBook = await db.get("SELECT id FROM book WHERE id = ?", [Number(bookId)]);
  if (!existingBook) return res.status(404).json({ message: "Book not found." });
  await db.run("DELETE FROM book WHERE id = ?", [Number(bookId)]);
  res.status(200).json({ message: "Book deleted successfully." });
}));

app.use((req, res) => res.status(404).json({ message: "Endpoint not found." }));

app.use((err, req, res, next) => {
  console.error("Request error:", err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: "Internal server error." });
});

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      app.listen(PORT, () => console.log(`Lab 3 API running on port ${PORT}`));
    })
    .catch((error) => {
      console.error("Database initialization failed:", error.message);
      process.exit(1);
    });
}

module.exports = { app, initializeDatabase };
