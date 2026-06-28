# OmniCorp Global — AI Support Ticket Classifier

**Client:** OmniCorp Global, IT Operations Division  
**Type:** Internal Proof-of-Concept | **Status:** Delivered

---

## Overview
An AI-powered triage tool that automatically classifies inbound IT support tickets, replacing the manual Excel-based process. Built on Google Gemini 2.5 Flash with a clean, accessible web interface.

---

## Live App
🔗 [View Deployment](https://your-vercel-link.vercel.app)

---

## Features
- AI classification with urgency scoring (1–10) and color-coded priority badges
- Confidence score with low-confidence warning for human review
- Human override panel for agent corrections
- Full session audit trail with timestamps
- XSS-sanitized inputs and secure server-side API key handling

---

## Stack
React 19 · Vite 8 · Tailwind CSS · Google Gemini 2.5 Flash · Vercel

---

## Local Setup
```bash
npm install
echo "VITE_GEMINI_API_KEY=your_key_here" > .env
npm run dev
```

---

*Prepared by Engineering Team — OmniCorp Global Internal Use Only*