// ══════════════════════════════════════════════════════
// CODELENS — controllers/reviewController.js
// ══════════════════════════════════════════════════════
const axios = require("axios");

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = "llama-3.3-70b-versatile";

const SUPPORTED_LANGUAGES = [
  "javascript", "typescript", "python", "java", "cpp", "c",
  "csharp", "go", "rust", "php", "ruby", "swift", "kotlin",
  "html", "css", "sql", "shell", "bash", "auto"
];

// ─── BACKEND SCORE CALCULATOR ─────────────────────────────────────────────
const calculateScore = (bugs = [], security = [], performance = [], improvements = []) => {
  let score = 100;
  bugs.forEach(b => {
    if      (b.severity === "critical") score -= 15;
    else if (b.severity === "high")     score -= 10;
    else if (b.severity === "medium")   score -= 5;
    else                                score -= 2;
  });
  security.forEach(s => {
    if      (s.severity === "critical") score -= 20;
    else if (s.severity === "high")     score -= 12;
    else if (s.severity === "medium")   score -= 7;
    else                                score -= 3;
  });
  performance.forEach(() => score -= 3);
  improvements.forEach(() => score -= 1);
  return Math.max(0, Math.min(100, score));
};

// ─── PROMPT BUILDER ────────────────────────────────────────────────────────
const buildReviewPrompt = (code, language, reviewType) => {
  const langHint = language !== "auto"
    ? `Language: ${language.toUpperCase()}`
    : "Auto-detect the programming language.";

  const reviewFocus = {
    full:        "Perform a FULL review covering ALL categories below.",
    bugs:        "Focus ONLY on bugs, errors, and logical issues. Leave other arrays empty.",
    security:    "Focus ONLY on security vulnerabilities. Leave other arrays empty.",
    performance: "Focus ONLY on performance issues. Leave other arrays empty.",
    style:       "Focus ONLY on code style, naming, and best practices. Leave other arrays empty."
  };

  const trimmedCode = code.length > 8000
    ? code.substring(0, 8000) + "\n\n// ... (truncated for review)"
    : code;

  return `You are an expert senior software engineer performing a professional code review. ${langHint}
${reviewFocus[reviewType] || reviewFocus.full}

Analyze the following code and respond with ONLY a valid JSON object.
No markdown, no backticks, no explanation — raw JSON only.

CODE TO REVIEW:
${trimmedCode}

Return EXACTLY this JSON structure:
{
  "language": "<detected or provided language>",
  "summary": "<2-3 sentence professional assessment>",
  "bugs": [
    {
      "severity": "critical|high|medium|low",
      "line": <line number or null>,
      "title": "<short bug title>",
      "issue": "<clear explanation>",
      "fix": "<specific actionable fix>"
    }
  ],
  "security": [
    {
      "severity": "critical|high|medium|low",
      "title": "<short vulnerability title>",
      "issue": "<clear explanation>",
      "fix": "<specific fix>"
    }
  ],
  "performance": [
    {
      "title": "<short title>",
      "issue": "<performance problem>",
      "suggestion": "<specific optimization>"
    }
  ],
  "improvements": [
    {
      "type": "readability|maintainability|best-practice|naming",
      "title": "<short title>",
      "suggestion": "<specific improvement>"
    }
  ],
  "positives": ["<what the code does well>"],
  "improvedCode": "<full rewritten improved version>",
  "estimatedComplexity": "low|medium|high",
  "linesAnalyzed": <number>
}`;
};

// ─── POST /api/cl/review/code ──────────────────────────────────────────────
const reviewCode = async (req, res) => {
  const { code, language = "auto", reviewType = "full" } = req.body;

  if (!code || typeof code !== "string")
    return res.status(400).json({ success: false, message: "Code is required." });
  if (code.trim().length < 5)
    return res.status(400).json({ success: false, message: "Code is too short to review." });
  if (code.length > 50000)
    return res.status(400).json({ success: false, message: "Code too long. Max 50,000 characters." });
  if (!SUPPORTED_LANGUAGES.includes(language))
    return res.status(400).json({ success: false, message: `Unsupported language: ${language}` });

  const prompt = buildReviewPrompt(code, language, reviewType);

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 4096,
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 45000
      }
    );

    const rawText = response.data?.choices?.[0]?.message?.content;
    if (!rawText)
      return res.status(500).json({ success: false, message: "Empty response from AI. Please try again." });

    let reviewData;
    try {
      const cleaned = rawText
        .replace(/^```json\n?/i, "")
        .replace(/^```\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();
      reviewData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError.message);
      return res.status(500).json({ success: false, message: "Failed to parse AI response. Please try again." });
    }

    reviewData.overallScore = calculateScore(
      reviewData.bugs         || [],
      reviewData.security     || [],
      reviewData.performance  || [],
      reviewData.improvements || []
    );

    return res.status(200).json({
      success:    true,
      reviewedBy: req.user?.email || "unknown",
      timestamp:  new Date().toISOString(),
      reviewType,
      data:       reviewData
    });

  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const errMsg = error.response.data?.error?.message || "Unknown error";
      if (status === 413) return res.status(413).json({ success: false, message: "Code is too large." });
      if (status === 429) return res.status(429).json({ success: false, message: "Rate limit hit. Wait a moment." });
      if (status === 400) return res.status(400).json({ success: false, message: `Bad request: ${errMsg}` });
      if (status === 401) return res.status(401).json({ success: false, message: "AI API key is invalid or missing." });
    }
    if (error.code === "ECONNABORTED")
      return res.status(504).json({ success: false, message: "Request timed out. Try with shorter code." });

    console.error("CodeLens Review Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to review code. Please try again." });
  }
};

// ─── POST /api/cl/review/github ────────────────────────────────────────────
const fetchGitHubCode = async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string")
    return res.status(400).json({ success: false, message: "GitHub URL is required." });
  if (!url.includes("github.com") && !url.includes("raw.githubusercontent.com"))
    return res.status(400).json({ success: false, message: "Only GitHub URLs are supported." });

  let rawUrl = url.trim();
  if (rawUrl.includes("github.com") && rawUrl.includes("/blob/"))
    rawUrl = rawUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");

  try {
    const headers = { "Accept": "application/vnd.github.v3.raw" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;

    const response = await axios.get(rawUrl, { headers, timeout: 15000, maxContentLength: 1024 * 1024 });
    const code = response.data;

    if (typeof code !== "string" || code.trim().length === 0)
      return res.status(400).json({ success: false, message: "File is empty or not a text file." });
    if (code.length > 50000)
      return res.status(400).json({ success: false, message: "File too large (max 50KB)." });

    const extMatch = rawUrl.match(/\.([a-zA-Z]+)$/);
    const extToLang = {
      js:"javascript", ts:"typescript", py:"python", java:"java",
      cpp:"cpp", c:"c", cs:"csharp", go:"go", rs:"rust",
      php:"php", rb:"ruby", swift:"swift", kt:"kotlin",
      html:"html", css:"css", sql:"sql", sh:"bash"
    };
    const detectedLanguage = extMatch ? (extToLang[extMatch[1].toLowerCase()] || "auto") : "auto";

    return res.status(200).json({
      success: true, code, language: detectedLanguage,
      sourceUrl: url, rawUrl,
      lines: code.split("\n").length, size: code.length
    });

  } catch (error) {
    if (error.response?.status === 404) return res.status(404).json({ success: false, message: "File not found." });
    if (error.response?.status === 403) return res.status(403).json({ success: false, message: "Access denied. Repo may be private." });
    if (error.code === "ECONNABORTED")  return res.status(504).json({ success: false, message: "Timed out fetching GitHub file." });
    console.error("CodeLens GitHub Fetch Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch code from GitHub." });
  }
};

module.exports = { reviewCode, fetchGitHubCode };