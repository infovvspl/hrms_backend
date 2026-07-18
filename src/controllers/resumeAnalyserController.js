const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const path = require("path");
const fs = require("fs");
const pool = require("../config/database");
const bcrypt = require("bcryptjs");

// ================= STOP WORDS =================
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "need",
  "dare", "ought", "used", "not", "no", "nor", "so", "yet", "both",
  "either", "neither", "each", "few", "more", "most", "other", "some",
  "such", "than", "too", "very", "just", "because", "if", "while",
  "although", "though", "since", "unless", "until", "when", "where",
  "who", "which", "that", "this", "these", "those", "i", "me", "my",
  "we", "our", "you", "your", "he", "she", "it", "his", "her", "its",
  "they", "their", "what", "all", "any", "about", "above", "after",
  "before", "between", "into", "through", "during", "without", "within",
  "along", "following", "across", "behind", "beyond", "plus", "except",
  "up", "out", "around", "down", "off", "over", "under", "again",
  "further", "then", "once", "here", "there", "how", "why", "also",
  "well", "much", "only", "own", "same", "etc"
]);

// ================= SKILL / TECH KEYWORDS =================
const COMMON_SKILLS = [
  // Languages
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust",
  "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl",
  "html", "css", "sql", "nosql", "bash", "shell", "powershell", "dart",

  // Frontend
  "react", "reactjs", "react.js", "angular", "angularjs", "vue", "vuejs",
  "svelte", "next.js", "nextjs", "nuxt", "redux", "mobx", "tailwind",
  "bootstrap", "material-ui", "mui", "ant design", "jquery", "sass",
  "webpack", "vite", "parcel", "rollup",

  // Backend
  "node.js", "nodejs", "express", "express.js", "django", "flask",
  "spring", "spring boot", "laravel", "rails", "asp.net", "fastapi",
  "nestjs", "graphql", "rest", "restful", "microservices", "websocket",

  // Databases
  "mysql", "postgresql", "postgres", "mongodb", "redis", "sqlite",
  "oracle", "mssql", "cassandra", "dynamodb", "firestore", "elasticsearch",
  "neo4j", "mariadb", "supabase", "firebase",

  // DevOps / Cloud
  "aws", "azure", "gcp", "docker", "kubernetes", "k8s", "jenkins",
  "github actions", "gitlab ci", "ci/cd", "terraform", "ansible",
  "linux", "nginx", "apache", "heroku", "vercel", "netlify",

  // AI / ML
  "machine learning", "deep learning", "nlp", "computer vision",
  "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
  "opencv", "llm", "gpt", "bert", "transformers", "hugging face",

  // Tools
  "git", "github", "gitlab", "bitbucket", "jira", "confluence",
  "figma", "photoshop", "postman", "swagger", "vscode", "intellij",

  // Soft skills / process
  "agile", "scrum", "kanban", "devops", "tdd", "bdd", "oop",
  "design patterns", "solid", "mvc", "api", "sdk", "saas", "paas",

  // HR / Business
  "hrms", "erp", "crm", "sap", "payroll", "recruitment", "onboarding",
  "performance management", "excel", "powerpoint", "word", "tableau",
  "power bi", "analytics", "data analysis"
];

// ================= EDUCATION KEYWORDS =================
const EDUCATION_KEYWORDS = [
  "bachelor", "b.sc", "bsc", "b.tech", "btech", "b.e", "be",
  "master", "m.sc", "msc", "m.tech", "mtech", "mba", "m.e", "me",
  "phd", "ph.d", "doctorate", "diploma", "pgdm", "b.com", "bcom",
  "bca", "mca", "bba", "b.a", "ba", "engineering", "computer science",
  "information technology", "software engineering", "data science",
  "electronics", "mechanical", "electrical", "civil"
];

// ================= EXPERIENCE PATTERNS =================
const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*years?\s*(?:of\s*)?(?:experience|exp)/gi,
  /experience\s*(?:of\s*)?(\d+)\+?\s*years?/gi,
  /(\d+)\+?\s*yrs?\s*(?:of\s*)?(?:experience|exp)/gi,
];

// ================= TEXT EXTRACTION =================
async function extractText(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const fileBuffer = fs.readFileSync(file.path);

  if (ext === ".pdf") {
    const result = await pdfParse(fileBuffer);
    return result.text;
  } else if (ext === ".docx" || ext === ".doc") {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } else if (ext === ".txt") {
    return fileBuffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// ================= TOKENISE =================
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\.\+#]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// ================= EXTRACT JD KEYWORDS =================
function extractJDKeywords(jdText) {
  const lower = jdText.toLowerCase();
  const tokens = tokenise(jdText);

  // Find skills mentioned in JD
  const skills = COMMON_SKILLS.filter((skill) => lower.includes(skill));

  // Also include any 2–3 word phrases from JD tokens
  const phrases = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    phrases.push(bigram);
  }

  // Education
  const education = EDUCATION_KEYWORDS.filter((edu) => lower.includes(edu));

  // Experience years requirement from JD
  let requiredYears = 0;
  for (const pattern of EXPERIENCE_PATTERNS) {
    const matches = [...lower.matchAll(pattern)];
    if (matches.length > 0) {
      const yrs = parseInt(matches[0][1]);
      if (yrs > requiredYears) requiredYears = yrs;
    }
  }

  return {
    skills: [...new Set(skills)],
    tokens: [...new Set(tokens)],
    phrases: [...new Set(phrases)],
    education: [...new Set(education)],
    requiredYears,
  };
}

// ================= SCORE RESUME =================
function scoreResume(resumeText, jdKeywords) {
  const lower = resumeText.toLowerCase();
  const resumeTokens = new Set(tokenise(resumeText));

  // --- Skills Score (50%) ---
  const matchedSkills = jdKeywords.skills.filter((skill) =>
    lower.includes(skill)
  );
  const skillScore =
    jdKeywords.skills.length > 0
      ? (matchedSkills.length / jdKeywords.skills.length) * 100
      : 0;

  // --- General Keyword Score for tools/tech (15%) ---
  const matchedTokens = jdKeywords.tokens.filter(
    (t) => resumeTokens.has(t) && !STOP_WORDS.has(t) && t.length > 2
  );
  const tokenScore =
    jdKeywords.tokens.length > 0
      ? (matchedTokens.length / Math.min(jdKeywords.tokens.length, 50)) * 100
      : 0;

  // --- Education Score (15%) ---
  const matchedEducation = EDUCATION_KEYWORDS.filter((edu) =>
    lower.includes(edu)
  );
  const hasRelevantEdu =
    jdKeywords.education.length > 0
      ? matchedEducation.some((e) => jdKeywords.education.includes(e))
      : matchedEducation.length > 0;
  const educationScore = hasRelevantEdu ? 100 : matchedEducation.length > 0 ? 60 : 20;

  // --- Experience Score (20%) ---
  let candidateYears = 0;
  for (const pattern of EXPERIENCE_PATTERNS) {
    const matches = [...lower.matchAll(pattern)];
    if (matches.length > 0) {
      const yrs = Math.max(...matches.map((m) => parseInt(m[1])));
      if (yrs > candidateYears) candidateYears = yrs;
    }
  }

  let experienceScore = 0;
  if (jdKeywords.requiredYears === 0) {
    // JD doesn't specify — give credit if any experience found
    experienceScore = candidateYears > 0 ? Math.min(candidateYears * 15, 100) : 50;
  } else {
    if (candidateYears >= jdKeywords.requiredYears) {
      experienceScore = 100;
    } else if (candidateYears > 0) {
      experienceScore = (candidateYears / jdKeywords.requiredYears) * 100;
    }
  }

  // --- Weighted Total ---
  const totalScore = Math.round(
    skillScore * 0.5 +
    experienceScore * 0.2 +
    educationScore * 0.15 +
    Math.min(tokenScore, 100) * 0.15
  );

  // --- Extract candidate name (heuristic: first non-empty line) ---
  const lines = resumeText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const candidateName = lines[0] && lines[0].length < 60 ? lines[0] : "Unknown";

  // --- Summary snippet ---
  const summary = resumeText
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 200)
    .concat("...");

  // --- Extract Email ---
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = resumeText.match(emailRegex);
  const candidateEmail = emailMatch ? emailMatch[0].toLowerCase() : null;

  return {
    score: Math.min(totalScore, 100),
    matchedSkills,
    candidateYears,
    educationFound: matchedEducation,
    candidateName,
    candidateEmail,
    summary,
    breakdown: {
      skillScore: Math.round(skillScore),
      experienceScore: Math.round(experienceScore),
      educationScore: Math.round(educationScore),
      tokenScore: Math.round(Math.min(tokenScore, 100)),
    },
  };
}

// ================= CONTROLLER =================
const analyseResumes = async (req, res) => {
  try {
    const { jobDescription } = req.body;
    const files = req.files;
    const company_id = req.user?.company_id || null;
    const branch_id = req.user?.branch_id || null;
    const created_by = req.user?.id || null;

    if (!company_id) {
      return res.status(401).json({ success: false, message: "Unauthorized. Company ID missing." });
    }

    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({
        success: false,
        message: "Job description is required.",
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one resume.",
      });
    }

    // Extract JD keywords
    const jdKeywords = extractJDKeywords(jobDescription);

    // Process each resume
    const results = [];
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      for (const file of files) {
        try {
          const text = await extractText(file);
          const analysis = scoreResume(text, jdKeywords);

          // Prepare candidate data
          let firstName = "Candidate";
          let lastName = "Unknown";
          if (analysis.candidateName && analysis.candidateName !== "Unknown") {
            const parts = analysis.candidateName.split(" ");
            firstName = parts[0].substring(0, 99);
            if (parts.length > 1) {
              lastName = parts.slice(1).join(" ").substring(0, 99);
            }
          }

          // Use extracted email or generate a fallback one
          const email = analysis.candidateEmail || `candidate_${Date.now()}_${Math.floor(Math.random() * 1000)}@temp.com`;
          const defaultPassword = await bcrypt.hash("Candidate@123", 10);
          
          // Insert User
          const userQuery = `
            INSERT INTO users (
              company_id, branch_id, first_name, last_name, email, password, employment_type, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `;
          
          // employment_type is NOT NULL, let's assume 1 for default or fetch it
          const userResult = await client.query(userQuery, [
            company_id, branch_id, firstName, lastName, email, defaultPassword, 1, created_by
          ]);
          
          const userId = userResult.rows[0].id;
          
          // Make file path relative to serve statically (e.g. /uploads/resumes/filename.pdf)
          const filePath = `/uploads/resumes/${file.filename}`;

          // Insert Document
          const docQuery = `
            INSERT INTO documents (user_id, resume, created_by)
            VALUES ($1, $2, $3)
            RETURNING id
          `;
          const docResult = await client.query(docQuery, [userId, filePath, created_by]);
          const docId = docResult.rows[0].id;

          // Link Document back to User (optional, since users has document_id)
          await client.query("UPDATE users SET document_id = $1 WHERE id = $2", [docId, userId]);

          results.push({
            filename: file.originalname,
            fileSize: file.size,
            userId,
            ...analysis,
            error: null,
          });
        } catch (err) {
          results.push({
            filename: file.originalname,
            fileSize: file.size,
            score: 0,
            matchedSkills: [],
            candidateYears: 0,
            educationFound: [],
            candidateName: file.originalname,
            summary: "",
            breakdown: { skillScore: 0, experienceScore: 0, educationScore: 0, tokenScore: 0 },
            error: `Failed to parse file: ${err.message}`,
          });
        }
      }

      await client.query("COMMIT");
    } catch (dbError) {
      await client.query("ROLLBACK");
      throw dbError;
    } finally {
      client.release();
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return res.status(200).json({
      success: true,
      totalResumes: files.length,
      jdSkillsDetected: jdKeywords.skills,
      requiredExperience: jdKeywords.requiredYears,
      results,
    });
  } catch (error) {
    console.error("Resume analyser error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during analysis.",
      error: error.message,
    });
  }
};

module.exports = { analyseResumes };

// ================= UPDATE CANDIDATE STATUSES =================
const updateCandidateStatuses = async (req, res) => {
  try {
    const { shortlisted, rejected } = req.body;
    // shortlisted: array of user IDs to set status = 'Shortlisted'
    // rejected: array of user IDs to set status = 'Rejected'

    if (!Array.isArray(shortlisted) || !Array.isArray(rejected)) {
      return res.status(400).json({ success: false, message: "shortlisted and rejected must be arrays of user IDs." });
    }

    if (shortlisted.length > 0) {
      await pool.query(
        `UPDATE users SET status = 'Shortlisted' WHERE id = ANY($1::int[])`,
        [shortlisted]
      );
    }

    if (rejected.length > 0) {
      await pool.query(
        `UPDATE users SET status = 'Rejected' WHERE id = ANY($1::int[])`,
        [rejected]
      );
    }

    return res.status(200).json({ success: true, message: "Candidate statuses updated successfully." });
  } catch (error) {
    console.error("Update candidate statuses error:", error);
    return res.status(500).json({ success: false, message: "Internal server error.", error: error.message });
  }
};

// ================= GET SHORTLISTED CANDIDATES =================
const getShortlistedCandidates = async (req, res) => {
  try {
    const company_id = req.user?.company_id || null;
    if (!company_id) {
      return res.status(401).json({ success: false, message: "Unauthorized. Company ID missing." });
    }

    const query = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.created_at, d.resume
      FROM users u
      LEFT JOIN documents d ON u.document_id = d.id
      WHERE u.company_id = $1 AND u.status = 'Shortlisted'
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query, [company_id]);

    return res.status(200).json({
      success: true,
      candidates: result.rows,
    });
  } catch (error) {
    console.error("Get shortlisted candidates error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching shortlisted candidates.",
      error: error.message,
    });
  }
};

// ================= SCHEDULE INTERVIEW =================
const sendEmail = require("../utils/sendEmail");

const scheduleInterview = async (req, res) => {
  try {
    const { candidateIds, subject, description } = req.body;
    const company_id = req.user?.company_id || null;
    const issued_by = req.user?.id || null;

    if (!company_id) {
      return res.status(401).json({ success: false, message: "Unauthorized. Company ID missing." });
    }

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ success: false, message: "candidateIds must be a non-empty array." });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: "Subject is required." });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: "Description is required." });
    }

    // Fetch company name & email
    const companyRes = await pool.query("SELECT company_name, email FROM company WHERE id = $1", [company_id]);
    const companyName = companyRes.rows[0]?.company_name || "Zenova HR";
    const companyEmail = companyRes.rows[0]?.email || null;

    // Fetch HR name & email
    let hrName = "";
    let hrEmail = "";
    if (req.user?.role === "employee" && issued_by) {
      // 1. If logged in as an employee/HR, use their name & email
      const userRes = await pool.query("SELECT first_name, last_name, email, work_email FROM users WHERE id = $1", [issued_by]);
      if (userRes.rows.length > 0) {
        hrName = `${userRes.rows[0].first_name || ""} ${userRes.rows[0].last_name || ""}`.trim();
        hrEmail = userRes.rows[0].work_email || userRes.rows[0].email;
      }
    }

    // 2. If logged in as company (or if the employee name wasn't found), get the HR Manager of the company
    if (!hrName && company_id) {
      const hrRes = await pool.query(
        `SELECT u.first_name, u.last_name, u.email, u.work_email 
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.company_id = $1 AND r.role_name = 'HR Manager'
         LIMIT 1`,
        [company_id]
      );
      if (hrRes.rows.length > 0) {
        hrName = `${hrRes.rows[0].first_name || ""} ${hrRes.rows[0].last_name || ""}`.trim();
        hrEmail = hrRes.rows[0].work_email || hrRes.rows[0].email;
      }
    }

    // 3. Fallback: If still not found, try any user in the company
    if (!hrName && company_id) {
      const anyUserRes = await pool.query(
        `SELECT first_name, last_name, email, work_email FROM users WHERE company_id = $1 LIMIT 1`,
        [company_id]
      );
      if (anyUserRes.rows.length > 0) {
        hrName = `${anyUserRes.rows[0].first_name || ""} ${anyUserRes.rows[0].last_name || ""}`.trim();
        hrEmail = anyUserRes.rows[0].work_email || anyUserRes.rows[0].email;
      }
    }

    const fromEmail = hrEmail || companyEmail;

    // Fetch candidates emails
    const candidatesRes = await pool.query(
      "SELECT id, first_name, last_name, email FROM users WHERE id = ANY($1::int[]) AND company_id = $2",
      [candidateIds, company_id]
    );

    const candidates = candidatesRes.rows;
    if (candidates.length === 0) {
      return res.status(400).json({ success: false, message: "No valid candidates found." });
    }

    const emailPromises = [];
    const dbPromises = [];

    for (const candidate of candidates) {
      const candidateName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
      
      // Personalize template if placeholders exist
      let personalizedDesc = description
        .replace(/\[Candidate Name\]/g, candidateName)
        .replace(/\[Company Name\]/g, companyName)
        .replace(/\[HR Name\]/g, hrName || "HR Manager");

      // Send email
      emailPromises.push(
        sendEmail.sendInterviewEmail({
          email: candidate.email,
          companyName,
          hrName,
          fromEmail,
          subject,
          description: personalizedDesc,
        })
      );

      // Save to database
      dbPromises.push(
        pool.query(
          `INSERT INTO interview_mail (user_id, subject, description, issued_by)
           VALUES ($1, $2, $3, $4)`,
          [candidate.id, subject, personalizedDesc, issued_by]
        )
      );
    }

    await Promise.all(emailPromises);
    await Promise.all(dbPromises);

    return res.status(200).json({
      success: true,
      message: `Interview invitation sent successfully to ${candidates.length} candidate(s).`,
    });
  } catch (error) {
    console.error("Schedule interview error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error scheduling interview.",
      error: error.message,
    });
  }
};

// ================= GET INTERVIEW HISTORY =================
const getInterviewHistory = async (req, res) => {
  try {
    const company_id = req.user?.company_id || null;
    if (!company_id) {
      return res.status(401).json({ success: false, message: "Unauthorized. Company ID missing." });
    }

    const query = `
      SELECT im.id, im.subject, im.description, im.created_at,
             u.first_name, u.last_name, u.email as candidate_email,
             hr.first_name as hr_first_name, hr.last_name as hr_last_name
      FROM interview_mail im
      JOIN users u ON im.user_id = u.id
      LEFT JOIN users hr ON im.issued_by = hr.id
      WHERE u.company_id = $1
      ORDER BY im.created_at DESC
    `;
    const result = await pool.query(query, [company_id]);

    return res.status(200).json({
      success: true,
      history: result.rows,
    });
  } catch (error) {
    console.error("Get interview history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching interview history.",
      error: error.message,
    });
  }
};

module.exports = {
  analyseResumes,
  updateCandidateStatuses,
  getShortlistedCandidates,
  scheduleInterview,
  getInterviewHistory
};
