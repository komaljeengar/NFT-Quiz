const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:5173", "https://*.vercel.app"] }));
app.use(express.json());

// Initialize attempts file
const attemptsFile = path.join(__dirname, "attempts.json");
if (!fs.existsSync(attemptsFile)) {
  fs.writeFileSync(attemptsFile, "{}");
}
let attempts = JSON.parse(fs.readFileSync(attemptsFile));

// In-memory store for current quiz questions
let currentQuestions = [];

// GET: Fetch 5 random quiz questions from OpenTDB
app.get("/api/quiz", async (req, res) => {
  console.log("GET /api/quiz");

  try {
    console.log("Fetching from OpenTDB...");
    const response = await axios.get(
      "https://opentdb.com/api.php?amount=10&category=18&difficulty=medium&type=multiple",
      { timeout: 5000 }
    );
    if (response.data.response_code !== 0) {
      console.error("OpenTDB error: response_code", response.data.response_code);
      return res.status(500).json({ error: "OpenTDB unavailable" });
    }
    const questions = response.data.results;

    // Pick 5 random questions
    const selected = [];
    const questionPool = [...questions];
    while (selected.length < 5 && questionPool.length > 0) {
      const index = Math.floor(Math.random() * questionPool.length);
      selected.push(questionPool.splice(index, 1)[0]);
    }

    // Format questions
    const formatted = selected.map((q, i) => ({
      id: i,
      question: q.question,
      answers: [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5),
      correct: q.correct_answer,
    }));

    // Store questions
    currentQuestions = formatted;
    console.log("Questions fetched:", formatted.map((q) => q.question));

    res.json(formatted);
  } catch (error) {
    console.error("Quiz fetch error:", error.message);
    res.status(500).json({ error: "Failed to fetch quiz questions" });
  }
});

// POST: Submit answers, score quiz, enforce daily limit
app.post("/api/quiz/submit", async (req, res) => {
  const { wallet, answers } = req.body;
  console.log("POST /api/quiz/submit - Payload:", {
    wallet: wallet?.slice(0, 6),
    answers,
  });

  // Validate input
  if (!wallet) {
    console.error("Missing wallet");
    return res.status(400).json({ error: "Wallet address required" });
  }
  if (!answers || Object.keys(answers).length < 5) {
    console.error("Invalid answers:", answers);
    return res.status(400).json({ error: "All 5 questions must be answered" });
  }

  // Normalize answers
  let normalizedAnswers = {};
  if (Array.isArray(answers)) {
    answers.forEach((ans, i) => {
      normalizedAnswers[i] = ans;
    });
  } else {
    normalizedAnswers = Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [parseInt(k), v])
    );
  }
  console.log("Normalized answers:", normalizedAnswers);

  // Check daily limit
  const lastAttempt = attempts[wallet];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  if (lastAttempt && now - lastAttempt < oneDay) {
    console.warn(`Wallet ${wallet.slice(0, 6)}... blocked: last attempt ${new Date(lastAttempt)}`);
    return res.status(403).json({ error: "One attempt per day allowed" });
  }

  try {
    // Use stored questions
    if (!currentQuestions || currentQuestions.length < 5) {
      console.error("No quiz questions available");
      return res.status(400).json({ error: "No active quiz. Start a new quiz" });
    }

    // Score answers
    let correct = 0;
    Object.entries(normalizedAnswers).forEach(([id, answer]) => {
      const q = currentQuestions[parseInt(id)];
      const isCorrect = q && answer && answer.toString() === q.correct.toString();
      if (isCorrect) {
        correct++;
      }
      console.log(
        `Question ${id}: User="${answer}", Correct="${q?.correct}", Match=${isCorrect}`
      );
    });
    const score = (correct / 5) * 100;
    console.log(`Score for ${wallet.slice(0, 6)}...: ${score}% (${correct}/5)`);

    // Update attempts if passed
    if (score >= 80) {
      attempts[wallet] = now;
      fs.writeFileSync(attemptsFile, JSON.stringify(attempts, null, 2));
      console.log(`Updated attempts.json for ${wallet.slice(0, 6)}...`);
      return res.json({ success: true, score });
    } else {
      return res.json({ success: false, score });
    }
  } catch (error) {
    console.error("Submission error:", error.message);
    res.status(500).json({ error: "Failed to process quiz" });
  }
});

module.exports = app;

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});