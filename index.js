require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const User = require("./models/User");
const LLMResponse = require("./models/LLMResponse")

const app = express();

if (!process.env.MONGODB_URI) {
  console.error("!! MONGODB_URI missing in .env");
  process.exit(1);
}

// middleware
app.use(cors());
app.use(express.json());

// connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("[API] Connected to MongoDB"))
  .catch((err) => {
    console.error("[API] MongoDB connection error:", err);
    process.exit(1);
  });

// API route — upsert user from Clerk
app.post("/api/users", async (req, res) => {
  try {
    console.log(`[user API] req is `, req.body);
    const { id:clerkId, email, firstName, lastName } = req.body;

    if (!clerkId) return res.status(400).json({ error: "clerkId is required" });

    const update = {
      clerkId,
      email: email || null,
      firstName: firstName || null,
      lastName: lastName || null
    };

    const user = await User.findOneAndUpdate({ clerkId }, update, {
      new: true,
      upsert: true,
    });

    res.json(user);
  } catch (err) {
    console.error(`[user API] error is `, err);
    res.status(500).json({ error: err.message });
  }
});

// API to store LLM response
app.post("/api/llm/responses", async (req, res) => {
  try {
    console.log(`[responses API] req is `, req.body);
    const { id:responseId, response, request, requestUrl, clerkId } = req.body;

    if (!responseId) return res.status(400).json({ error: "responseId is required" });
    if (!clerkId) return res.status(400).json({ error: "clerkId is required" });

    // find matching user
    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(400).json({ error: "User not found in database" });
    } 

    const update = {
      responseId,
      request,
      requestUrl: requestUrl || null,
      response: JSON.stringify(response),
      user: user._id
    };

    const dbResponse = await LLMResponse.findOneAndUpdate({ responseId }, update, {
      new: true,
      upsert: true,
    });
    console.log(`[responses API] dbResponse is `, dbResponse);
    res.json(dbResponse);
  } catch (err) {
    console.error(`[responses API] error is `, err);
    res.status(500).json({ error: err.message });
  }
});


// user history api for dashboard
app.get("/api/llm/history/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params;

    const user = await User.findOne({ clerkId });
    if (!user) return res.status(400).json({ error: "User not found" });

    const history = await LLMResponse.find({ user: user._id })
      .sort({ createdAt: -1 });

    res.json(history);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[API] Listening on http://localhost:${PORT}`);
});
