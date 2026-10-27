import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
dotenv.config();
const app = express();
app.use(cors({ origin: ["http://localhost:3001", "http://127.0.0.1:3001"] }));
app.use(express.json());
const port = process.env.PORT || 5001;

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, message: "Express is running and MySQL is connected." });
  } catch (e) {
    res.status(500).json({ ok: false, message: "MySQL connection failed", error: e.message });
  }
});

app.get("/api/books", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT id,title,author,genre,isbn,quantity,available_quantity,created_at FROM books ORDER BY id DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ message: "Could not load books", error: e.message }); }
});

app.post("/api/books", async (req, res) => {
  const { title, author, genre, isbn, quantity } = req.body;
  const qty = Number(quantity);
  if (!title?.trim() || !author?.trim() || !genre?.trim() || !isbn?.trim() || !Number.isInteger(qty) || qty < 0)
    return res.status(400).json({ message: "Enter title, author, genre, ISBN and a valid quantity." });
  try {
    const [result] = await pool.execute(
      "INSERT INTO books (title,author,genre,isbn,quantity,available_quantity) VALUES (?,?,?,?,?,?)",
      [title.trim(), author.trim(), genre.trim(), isbn.trim(), qty, qty]
    );
    const [rows] = await pool.execute("SELECT * FROM books WHERE id=?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ message: "Could not add book. Check whether ISBN already exists.", error: e.message }); }
});

app.put("/api/books/:id", async (req, res) => {
  const { title, author, genre, isbn, quantity, available_quantity } = req.body;
  const qty = Number(quantity), available = Number(available_quantity);
  if (!title?.trim() || !author?.trim() || !genre?.trim() || !isbn?.trim() ||
      !Number.isInteger(qty) || !Number.isInteger(available) || qty < 0 || available < 0 || available > qty)
    return res.status(400).json({ message: "Check book fields and quantity values." });
  try {
    const [result] = await pool.execute(
      "UPDATE books SET title=?,author=?,genre=?,isbn=?,quantity=?,available_quantity=? WHERE id=?",
      [title.trim(), author.trim(), genre.trim(), isbn.trim(), qty, available, Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Book not found." });
    const [rows] = await pool.execute("SELECT * FROM books WHERE id=?", [Number(req.params.id)]);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ message: "Could not update book.", error: e.message }); }
});

app.delete("/api/books/:id", async (req, res) => {
  try {
    const [result] = await pool.execute("DELETE FROM books WHERE id=?", [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Book not found." });
    res.json({ message: "Book deleted." });
  } catch (e) { res.status(500).json({ message: "Could not delete book; it may have transaction history.", error: e.message }); }
});

app.get("/api/users", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT id,name,membership_id,role,created_at FROM users ORDER BY id DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ message: "Could not load users.", error: e.message }); }
});

app.post("/api/users", async (req, res) => {
  const { name, membership_id, role = "member" } = req.body;
  if (!name?.trim() || !membership_id?.trim()) return res.status(400).json({ message: "Name and membership ID are required." });
  try {
    const [result] = await pool.execute(
      "INSERT INTO users (name,membership_id,role,password_hash) VALUES (?,?,?,?)",
      [name.trim(), membership_id.trim(), role === "admin" ? "admin" : "member", "demo-only"]
    );
    const [rows] = await pool.execute("SELECT id,name,membership_id,role,created_at FROM users WHERE id=?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ message: "Could not add user; membership ID may already exist.", error: e.message }); }
});

app.post("/api/login", async (req, res) => {
  const { membership_id } = req.body;
  try {
    const [rows] = await pool.execute("SELECT id,name,membership_id,role FROM users WHERE membership_id=?", [membership_id || ""]);
    if (!rows.length) return res.status(401).json({ message: "Membership ID not found." });
    res.json({ user: rows[0], message: "Demo login successful." });
  } catch (e) { res.status(500).json({ message: "Login failed.", error: e.message }); }
});

app.get("/api/transactions", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT t.*, b.title AS book_title, u.name AS user_name FROM transactions t LEFT JOIN books b ON t.book_id=b.id LEFT JOIN users u ON t.user_id=u.id ORDER BY t.id DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ message: "Could not load transactions. Check your table columns.", error: e.message }); }
});

app.get("/api/dashboard", async (_req, res) => {
  try {
    const [[b]] = await pool.query("SELECT COUNT(*) AS totalBooks, COALESCE(SUM(available_quantity),0) AS availableCopies, COALESCE(SUM(quantity-available_quantity),0) AS borrowedCopies, COALESCE(SUM(CASE WHEN available_quantity < 2 THEN 1 ELSE 0 END),0) AS lowStockBooks FROM books");
    const [[u]] = await pool.query("SELECT COUNT(*) AS totalMembers FROM users");
    res.json({ ...b, ...u });
  } catch (e) { res.status(500).json({ message: "Could not load dashboard.", error: e.message }); }
});

app.listen(port, () => console.log(`Community Library API running at http://localhost:${port}`));
