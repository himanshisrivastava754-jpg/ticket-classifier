import React, { useState } from "react";

function AuditTrail({ latest }) {
  const [open, setOpen] = useState(false);

  if (!latest) return null;

  return (
    <div className="audit">
      <button className="audit-toggle" onClick={() => setOpen((s) => !s)}>
        {open ? "Hide Audit Trail" : "Show Latest Audit Entry"}
      </button>

      {open && (
        <div className="audit-card">
          <div><strong>Timestamp:</strong> {latest.timestamp}</div>
          <div><strong>Session:</strong> {latest.session_id}</div>
          <div><strong>User Action:</strong> {latest.user_action}</div>
          <div style={{ marginTop: 8 }}>
            <strong>Original Input:</strong>
            <div className="card small">{latest.original_input}</div>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>AI Results:</strong>
            <pre className="card small">{JSON.stringify(latest.ai_classification_results, null, 2)}</pre>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Final Classification:</strong>
            <pre className="card small">{JSON.stringify(latest.final_classification, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditTrail;
