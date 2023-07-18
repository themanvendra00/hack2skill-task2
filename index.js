const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { connection } = require("./config/db");
const Video = require("./models/video.model");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Function to call YouTube API and save data to the database
const fetchAndSaveVideos = async () => {
  try {
    const tag = "football";
    const apiKey = process.env.YOUTUBE_API_KEY;

    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: apiKey,
          q: tag,
          part: "snippet",
          maxResults: 50,
          type: "video",
          order: "date",
        },
      }
    );

    const videos = response.data.items.map((item) => ({
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnails: item.snippet.thumbnails,
    }));

    await Video.insertMany(videos);
  } catch (error) {
    console.error("Error fetching and saving videos:", error);
  }
};

// Call the YouTube API continuously in the background with a 10-second interval
const interval = setInterval(fetchAndSaveVideos, 10000);

// Route to get paginated video data sorted by published date in descending order
app.get("/api/videos", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;

  try {
    const totalCount = await Video.countDocuments();
    const totalPages = Math.ceil(totalCount / perPage);

    const videos = await Video.find()
      .sort({ publishedAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    res.json({
      videos,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route for searching videos by title or description
app.get("/api/search", async (req, res) => {
  const query = req.query.query;

  try {
    const videos = await Video.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    });

    res.json({ videos });
  } catch (error) {
    console.error("Error searching videos:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, async () => {
  try {
    await connection;
    console.log("Connected to db");
  } catch (error) {
    console.log("Error occurred while connecting to db", error);
  }
  console.log(`Server running on http://localhost:${port}`);
});
