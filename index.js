import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDb from "./config/db.js";
import bookmarkRouter from "./routes/bookmarkROUTES.js";
import authRouter from "./routes/authRoutes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());

// Connect to MongoDB before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/bookmarks", bookmarkRouter);

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;

  connectDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error.message);
    });
}

export default app;
