const mongoose = require("mongoose");

const videoSchema = mongoose.Schema({
  title: String,
  description: String,
  publishedAt: Date,
  thumbnails: Object,
});

const Video = mongoose.model("Video", videoSchema);

module.exports = Video