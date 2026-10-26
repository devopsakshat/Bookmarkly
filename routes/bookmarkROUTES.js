
import mongoose from "mongoose";
import Bookmark from "../models/bookmark.js";
import express from "express";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();


router.use(authenticateToken);

// GET all bookmarks 
router.get("/", async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({
      owner: req.user._id,
    });

    return res.status(200).json(bookmarks);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// GET one bookmark
router.get("/:id", async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      message: "Invalid bookmark ID",
    });
  }

  try {
    const foundBookmark = await Bookmark.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!foundBookmark) {
      return res.status(404).json({
        message: "Bookmark not found",
      });
    }

    return res.status(200).json(foundBookmark);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// CREATE bookmark 
router.post("/", async (req, res) => {
  const { title, url, category } = req.body;

  if (
    [title, url, category].some(
      (value) =>
        typeof value !== "string" || value.trim() === ""
    )
  ) {
    return res.status(400).json({
      message: "Fields cannot be empty",
    });
  }

  try {
    const savedBookmark = await Bookmark.create({
      title: title.trim(),
      url: url.trim(),
      category: category.trim(),
      owner: req.user._id,
    });

    return res.status(201).json(savedBookmark);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// UPDATE bookmark — ID aur owner dono match hone chahiye
router.patch("/:id", async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      message: "Invalid bookmark ID",
    });
  }

  const allowedFields = ["title", "url", "category"];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(req.body, field)) {
      if (
        typeof req.body[field] !== "string" ||
        !req.body[field].trim()
      ) {
        return res.status(400).json({
          message: `${field} cannot be empty`,
        });
      }

      updates[field] = req.body[field].trim();
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "No valid fields provided to update",
    });
  }

  try {
    const updatedBookmark = await Bookmark.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedBookmark) {
      return res.status(404).json({
        message: "Bookmark not found",
      });
    }

    return res.status(200).json(updatedBookmark);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

// DELETE bookmark 
router.delete("/:id", async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      message: "Invalid bookmark ID",
    });
  }

  try {
    const deletedBookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!deletedBookmark) {
      return res.status(404).json({
        message: "Bookmark not found",
      });
    }

    return res.status(200).json({
      message: "Bookmark deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
