import React, { useEffect, useMemo, useState } from "react";
import { sanitizeInput, callGemini, saveAuditEntry, postAuditToServer, getLatestAudit } from "../lib/api";
import AuditTrail from "./AuditTrail";

// TRD-specified exact system prompt
const SYSTEM_PROMPT = `You are a highly specialized, Level 4 IT Operations Support Engineer AI, designed for rapid, precise classification of inbound support tickets for OmniCorp Global. Your primary function is to analyze the user's provided complaint and extract critical information for triage. You must return a STRICT JSON object ONLY. The JSON object must contain the following keys: "category" (string, choose from: "Hardware Malfunction", "Software Bug/Issue", "Network Connectivity", "Account & Access Management", "Peripheral Support", "Security Incident", "Data Request/Recovery", "System Performance", "Application Integration", "Other"), "sub_category" (string, a more granular classification if applicable, e.g., "Laptop", "Printer", "VPN", "Password Reset", "Email Client", "ERP System", "Downtime", "Slow Performance", "Licensing", "Malware" - if no specific sub-category, return "General"), "urgency_score" (integer, 1-10, where 1 is low priority with minimal disruption, 10 is critical system down impacting core business functions), "impact_level" (string, choose from: "Individual User", "Team/Department", "Multiple Departments", "Enterprise-Wide"), "recommended_action" (string, a concise, 1-2 sentence suggested next step for the human agent, e.g., "Check user's AD account status."), and "confidence_score" (integer, 0-100, reflecting the AI's certainty in its classification). If the input is unclear, ambiguous, or insufficient for classification, set "category" to "Unclassified" and "confidence_score" to 0. Prioritize security incidents with an urgency_score of 9 or 10. For password reset requests, ensure "category" is "Account & Access Management" and "sub_category" is "Password Reset" with an urgency_score of 7.`;

// TRD-specified exact values
const DEFAULT_CATEGORIES = [
  "Hardware Malfunction",
  "Software Bug/Issue",
  "Network Connectivity",
  "Account & Access Management",
  "Peripheral Support",
  "Security Incident",
  "Data Request/Recovery",
  "System Performance",
  "Application Integration",
  "Other",
];
const DEFAULT_SUBCATS = ["General", "Laptop", "Printer", "VPN", "Password Reset", "Email Client", "ERP System", "Downtime", "Slow Performance", "Licensing", "Malware"];
const IMPACT_LEVELS = ["Individual User", "Team/Department", "Multiple Departments", "Enterprise-Wide"];

function Badge({ children, color }) {
  return (
    <span className={`badge ${color || "neutral"}`}>{children}</span>
  );
}

function Spinner() {
  return <div className="spinner" aria-hidden="true"></div>;
}

function generateSession() {
  return "sess_" + Math.random().toString(36).slice(2, 11);
}

function TicketAnalyzer() {
  const [text, setText] = useState("");
  const [sanitized, setSanitized] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [responseMs, setResponseMs] = useState(null);
  const [sessionId] = useState(() => sessionStorage.getItem("tc_session_id") || generateSession());
  const [overrides, setOverrides] = useState(null);
  const [showOverride, setShowOverride] = useState(false);
  // Fix: latestAudit as state so it refreshes after each classification
  const [latestAudit, setLatestAudit] = useState(() => getLatestAudit());

  useEffect(() => {
    if (!sessionStorage.getItem("tc_session_id")) sessionStorage.setItem("tc_session_id", sessionId);
  }, [sessionId]);

  useEffect(() => {
    setSanitized(sanitizeInput(text));
  }, [text]);

  const remaining = useMemo(() => 5000 - (text?.length || 0), [text]);

  function urgencyColor(score) {
    if (score <= 3) return "green";
    if (score <= 6) return "yellow";
    if (score <= 8) return "orange";
    return "red";
  }

  async function runAnalysis(useSanitized = true) {
    setError(null);
    setLoading(true);
    setResult(null);
    const payload = useSanitized ? sanitizeInput(text) : text;
    const start = performance.now();
    try {
      const ai = await callGemini(payload, SYSTEM_PROMPT);
      const ms = Math.round(performance.now() - start);
      setResponseMs(ms);
      setResult(ai);

      // TRD: telemetry log on every primary action
      console.log("[Analytics] User interacted with Support Ticket Classifier");

      const finalClassification = overrides ? { ...ai, overridden: overrides } : ai;

      const audit = {
        timestamp: new Date().toISOString(),
        original_input: payload,
        ai_classification_results: ai,
        final_classification: finalClassification,
        user_action: overrides ? "human_override" : "ai_classified",
        session_id: sessionId,
      };

      saveAuditEntry(audit);
      // Fix: refresh audit trail state immediately
      setLatestAudit(getLatestAudit());

      try {
        await postAuditToServer(audit);
      } catch (e) {
        console.warn("Audit post failed", e);
      }

    } catch (err) {
      if (err.status === 401) setError("Unauthorized (401). Check API key.");
      else if (err.status === 403) setError("Forbidden (403). Permission denied.");
      else if (err.status === 429) setError("Rate limit reached (429). Try again later.");
      else if (err.status === 500) setError("Server error (500). Try again later.");
      else if (err.code === "INVALID_JSON") setError("Invalid JSON returned by model.");
      else if (err.code === "NO_KEY") setError("Gemini API key missing. Please set VITE_GEMINI_API_KEY.");
      else setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleReclassify() {
    runAnalysis(true);
  }

  function applyOverride(field, value) {
    setOverrides((o) => ({ ...(o || {}), [field]: value }));
  }

  return (
    <div className="heroCard">
      <h2>Support Ticket Analysis</h2>

      <p>
        Enter the employee's complaint below. The AI will classify, prioritize and recommend the next action.
      </p>

      {/* a11y: aria-label on textarea */}
      <textarea
        aria-label="Support ticket description"
        placeholder="Describe the IT issue here..."
        maxLength={5000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      ></textarea>

      <div className="bottomRow">
        <span>Characters Remaining : {remaining} / 5000</span>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            aria-label="Analyze ticket"
            onClick={() => runAnalysis(true)}
            disabled={loading || !text.trim()}
          >
            {loading ? (
              <>
                <Spinner /> Analyzing...
              </>
            ) : (
              "Analyze Ticket"
            )}
          </button>

          <button
            aria-label="Reclassify ticket"
            onClick={handleReclassify}
            disabled={loading || !result}
          >
            Reclassify
          </button>

          <button
            aria-label="Override classification"
            onClick={() => setShowOverride((s) => !s)}
            disabled={!result}
          >
            {showOverride ? "Hide Override" : "Override Classification"}
          </button>
        </div>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      {result && (
        <section className="resultCard">
          <div className="resultRow">
            <Badge>{result.category}</Badge>
            <Badge>{result.sub_category}</Badge>
            <Badge color={urgencyColor(result.urgency_score)}>
              Urgency: {result.urgency_score}
              {urgencyColor(result.urgency_score) === "red" && <span className="pulse" aria-label="Critical urgency indicator" />}
            </Badge>
            <Badge>Impact: {result.impact_level}</Badge>
          </div>

          <div className="recommendation">
            <h4>Recommended Action</h4>
            <div className="card">{result.recommended_action}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {/* Fix: show percentage number as TRD requires */}
            <label>Confidence: {result.confidence_score}%</label>
            <div className="progress" role="progressbar" aria-valuenow={result.confidence_score} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-bar" style={{ width: `${result.confidence_score}%` }} />
            </div>
            {result.confidence_score < 50 && (
              <div className="warning" role="alert">⚠ Review Required: Low Confidence ({result.confidence_score}%)</div>
            )}
          </div>

          {showOverride && (
            <div className="overridePanel">
              <div>
                <label htmlFor="override-category">Category</label>
                <select
                  id="override-category"
                  aria-label="Override category"
                  defaultValue={result.category}
                  onChange={(e) => applyOverride("category", e.target.value)}
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="override-subcat">Sub-category</label>
                <select
                  id="override-subcat"
                  aria-label="Override sub-category"
                  defaultValue={result.sub_category}
                  onChange={(e) => applyOverride("sub_category", e.target.value)}
                >
                  {DEFAULT_SUBCATS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="override-urgency">Urgency</label>
                <select
                  id="override-urgency"
                  aria-label="Override urgency score"
                  defaultValue={result.urgency_score}
                  onChange={(e) => applyOverride("urgency_score", Number(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="override-impact">Impact</label>
                <select
                  id="override-impact"
                  aria-label="Override impact level"
                  defaultValue={result.impact_level}
                  onChange={(e) => applyOverride("impact_level", e.target.value)}
                >
                  {IMPACT_LEVELS.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  aria-label="Save human override"
                  onClick={() => {
                    const final = { ...result, ...overrides };
                    const audit = {
                      timestamp: new Date().toISOString(),
                      original_input: sanitized,
                      ai_classification_results: result,
                      final_classification: { ...final, human_override: true },
                      user_action: "human_override",
                      session_id: sessionId,
                    };
                    saveAuditEntry(audit);
                    setLatestAudit(getLatestAudit());
                    console.log("[Analytics] User interacted with Support Ticket Classifier");
                    setShowOverride(false);
                  }}
                >
                  Save Override
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <AuditTrail latest={latestAudit} />

      <footer className="footer">
        <div>API Response Time: {responseMs ? `${responseMs} ms` : "-"}</div>
      </footer>
    </div>
  );
}

export default TicketAnalyzer;