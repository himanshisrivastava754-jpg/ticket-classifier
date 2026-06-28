// Small API utilities: sanitization, Gemini call, and audit log helpers
export function sanitizeInput(text) {
  if (!text) return "";
  // Remove HTML tags and control characters
  const withoutTags = text.replace(/<[^>]*>/g, "");
  const withoutCtl = withoutTags.replace(/[\x00-\x1F\x7F]/g, "");
  // Trim and collapse whitespace
  return withoutCtl.trim().replace(/\s+/g, " ");
}

function extractJsonFromString(s) {
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("invalid_json");
  const substr = s.substring(first, last + 1);
  return JSON.parse(substr);
}

function hasRequiredKeys(obj) {
  return (
    obj &&
    typeof obj === "object" &&
    ["category", "sub_category", "urgency_score", "impact_level", "recommended_action", "confidence_score"].every(
      (k) => k in obj
    )
  );
}

export async function callGemini(sanitizedText, systemPrompt = "") {
  // This POST is handled by the gemini-proxy plugin in vite.config.js,
  // which forwards it to the real Gemini REST API using the server-side key.
  const endpoint = `/api/gemini`;

  // Correct Gemini generateContent request body:
  //   - system_instruction carries the system prompt
  //   - contents is an array of turns; a single user turn suffices here
  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: sanitizedText }],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 512,
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = new Error(`API Error ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const raw = await res.text();

  // Parse the Gemini generateContent response shape:
  // { candidates: [{ content: { parts: [{ text: "..." }] } }] }
  try {
    const parsed = JSON.parse(raw);

    // If the top-level object already has the required classification keys, return directly
    if (hasRequiredKeys(parsed)) return parsed;

    // Extract the text from the standard Gemini response path
    const candidateText =
      parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
      parsed?.candidates?.[0]?.content?.parts?.map?.((p) => p.text).join("") ??
      null;

    if (candidateText) {
      try {
        const fromCandidate = extractJsonFromString(candidateText);
        if (hasRequiredKeys(fromCandidate)) return fromCandidate;
        // If extractJsonFromString gave us something without required keys, try direct parse
        const direct = JSON.parse(candidateText);
        if (hasRequiredKeys(direct)) return direct;
        return fromCandidate; // return best-effort anyway
      } catch {
        const err = new Error("Invalid JSON in model candidate text");
        err.code = "INVALID_JSON";
        err.raw = candidateText;
        throw err;
      }
    }

    // Last resort: scan the full raw response for any JSON object
    return extractJsonFromString(raw);
  } catch (e) {
    if (e.code === "INVALID_JSON") throw e;
    // If overall JSON parse failed, try to extract a JSON substring from raw text
    try {
      return extractJsonFromString(raw);
    } catch {
      const err = new Error("Invalid JSON from model");
      err.code = "INVALID_JSON";
      err.raw = raw;
      throw err;
    }
  }
}

const AUDIT_KEY = "ticket_classifier_audit";

export function saveAuditEntry(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
    existing.unshift(entry);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch (e) {
    console.warn("Failed to save audit entry", e);
  }
}

export function getLatestAudit() {
  try {
    const existing = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
    return existing[0] || null;
  } catch {
    return null;
  }
}

export async function postAuditToServer(entry) {
  // Simulate sending an audit log to an external server. We attempt the POST
  // but do not require success; failures are caught by caller.
  return fetch("https://api.example.com/v1/audit-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
}