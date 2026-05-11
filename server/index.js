import express from "express";

const app = express();
const port = 3001;

app.use(express.json());

app.get("/api/health", (req, res) => {
  return res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
