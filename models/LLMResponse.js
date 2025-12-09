const mongoose = require("mongoose");

const llmResponseSchema = new mongoose.Schema(
  {
    responseId: { type: String, unique: true, required: true },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true  // every response tied to a user
    },

    request: String,
    response: String,
    requestUrl: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("LLMResponse", llmResponseSchema);