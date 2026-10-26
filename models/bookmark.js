import mongoose from "mongoose";

const bookmarksModel = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },

    url: {
      type: String,
      required: true,
      trim: true,

      validate: {
        validator: function (value) {
          try {
            const url = new URL(value);
            return url.protocol === "http:" || "https:";
          } catch (error) {
            return false;
          }
        },
      },
      message: "URL must be a valid HTTP or HTTPS URL",
    },

    category: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 30,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("bookmark", bookmarksModel);
