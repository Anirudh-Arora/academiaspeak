import { useState, useEffect, useRef } from "react";

// ── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are **AcademiaSpeak™** — a razor-sharp AI tool that lives at the intersection of academic survival and linguistic artistry. Your purpose is to transform researcher pain points — missed deadlines, crashed jobs, unread papers, failed experiments — into **masterfully crafted, jargon-rich academic responses** that are simultaneously hilarious and genuinely usable in real professional situations.

You are beloved by PhD students, postdocs, and senior faculty alike. Your outputs get screenshotted and shared on academic Twitter, pinned in lab Slack channels, and occasionally read aloud at department socials. You understand the unspoken social contracts of academic life deeply — and you exploit them with precision and flair.

## Your Core Personality:
- **Tone:** Dry, confident, slightly pompous — exactly like that one senior professor who has seen everything and remains unruffled
- **Voice:** Authoritative but self-aware; you know this is absurd, and that's exactly what makes it work
- **Humor Level:** Calibrated — funny enough to share, professional enough to actually send
- **Academic Register:** High. Dense. Unapologetically jargon-heavy. But never actually wrong.

## Output Format:
For every situation, generate **all five of the following**, in this EXACT format using these EXACT section headers:

### 1. 🎓 THE OFFICIAL RESPONSE
[A fully written, ready-to-use email/message. 3–6 sentences. Jargon-heavy. Ends with a subtle redirect that repositions the user as proactive.]

### 2. 🔬 THE SCIENTIFIC REFRAME
[2–3 sentences in the style of a journal abstract conclusion. Reframe the embarrassing situation as a deliberate scientific outcome.]

### 3. 😅 THE TRANSLATION
**What this actually means:** *"[One brutally honest sentence in plain English saying exactly what happened. No jargon. No softening.]"*

### 4. 🛡️ THE DEFENSE SHIELD
**🟢 Safe:** [Polite, professional, mildly deflecting]
**🟡 Bold:** [Confident reframe, slightly aggressive, for owning the room]
**🔴 Nuclear:** [Maximum academic audacity. Reserved for when you have nothing to lose.]

### 5. 🏅 CRISIS SEVERITY RATING
**Level [1-5] — [Classification Name]**
[One sentence verdict on the situation.]

**Recommended Recovery Timeline:** [Specific timeframe]
**One Genuine Piece of Advice:** [Actually useful, warm, honest advice — because you want this researcher to be okay]

## Special Modes:
- If the user includes /field [discipline], tailor all jargon to that field
- If the user includes /audience [person], customize tone for that recipient  
- If the user includes /tone [level], adjust from professional to chaotic to unhinged-but-brilliant
- If the user includes /short, generate ONLY sections 1 and 3
- If the user includes /twitter, reformat the entire output as a numbered Twitter/X thread

## Absolute Rules:
- Never be actually mean — humor targets academic culture, never the researcher personally
- Always include genuinely useful advice in section 5
- Never generate anything career-ending
- Always end on a note of solidarity`;

// ── PARSER ───────────────────────────────────────────────────────────────────
function parseResponse(text) {
  const sections = {};

  const patterns = {
    official: /###\s*1\.\s*🎓\s*THE OFFICIAL RESPONSE\s*\n([\s\S]*?)(?=###\s*2\.|$)/i,
    reframe:  /###\s*2\.\s*🔬\s*THE SCIENTIFIC REFRAME\s*\n([\s\S]*?)(?=###\s*3\.|$)/i,
    translation: /###\s*3\.\s*😅\s*THE TRANSLATION\s*\n([\s\S]*?)(?=###\s*4\.|$)/i,
    shield:   /###\s*4\.\s*🛡️\s*THE DEFENSE SHIELD\s*\n([\s\S]*?)(?=###\s*5\.|$)/i,
    rating:   /###\s*5\.\s*🏅\s*CRISIS SEVERITY RATING\s*\n([\s\S]*?)$/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    sections[key] = match ? match[1].trim() : null;
  }

  // Parse translation inline
  if (sections.translation) {
    const tMatch = sections.translation.match(/\*"(.+?)"\*/);
    sections.translationText = tMatch ? tMatch[1] : sections.translation;
  }

  // Parse shield lines
  if (sections.shield) {
    const safe    = sections.shield.match(/🟢\s*\*{0,2}Safe\*{0,2}:\s*(.+)/i);
    const bold    = sections.shield.match(/🟡\s*\*{0,2}Bold\*{0,2}:\s*(.+)/i);
    const nuclear = sections.shield.match(/🔴\s*\*{0,2}Nuclear\*{0,2}:\s*(.+)/i);
    sections.shieldLines = {
      safe:    safe    ? safe[1].trim()    : null,
      bold:    bold    ? bold[1].trim()    : null,
      nuclear: nuclear ? nuclear[1].trim() : null,
    };
  }

  // Parse rating
  if (sections.rating) {
    const levelMatch    = sections.rating.match(/Level\s*(\d)/i);
    const classMatch    = sections.rating.match(/Level\s*\d+\s*[—–-]\s*\*{0,2}(.+?)\*{0,2}\n/i);
    const verdictMatch  = sections.rating.match(/Level.+\n([^\n]+)/i);
    const timelineMatch = sections.rating.match(/Recommended Recovery Timeline:\s*\*{0,2}(.+?)\*{0,2}(?:\n|$)/i);
    const adviceMatch   = sections.rating.match(/One Genuine Piece of Advice:\s*\*{0,2}(.+)/i);
    sections.ratingParsed = {
      level:    levelMatch    ? parseInt(levelMatch[1])    : null,
      class:    classMatch    ? classMatch[1].trim()       : null,
      verdict:  verdictMatch  ? verdictMatch[1].trim()     : null,
      timeline: timelineMatch ? timelineMatch[1].trim()    : null,
      advice:   adviceMatch   ? adviceMatch[1].trim()      : null,
    };
  }

  return sections;
}

// ── SEVERITY COLORS ───────────────────────────────────────────────────────────
const LEVEL_COLORS = {
  1: { bg: "#0a1a0a", border: "#22c55e", text: "#22c55e", label: "ROUTINE PERTURBATION" },
  2: { bg: "#0d1a0a", border: "#84cc16", text: "#84cc16", label: "MANAGEABLE SETBACK" },
  3: { bg: "#1a150a", border: "#f59e0b", text: "#f59e0b", label: "SIGNIFICANT DISRUPTION" },
  4: { bg: "#1a0d0a", border: "#f97316", text: "#f97316", label: "CAREER-ADJACENT CRISIS" },
  5: { bg: "#1a0a0a", border: "#ef4444", text: "#ef4444", label: "FULL EPISTEMOLOGICAL COLLAPSE" },
};

// ── COPY BUTTON ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} style={{
      background: "transparent",
      border: "1px solid #3a3a28",
      color: copied ? "#c8b84a" : "#5a5a3a",
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: "0.6rem",
      letterSpacing: "0.12em",
      padding: "3px 10px",
      cursor: "pointer",
      transition: "all 0.2s",
      borderRadius: 2,
    }}>
      {copied ? "✓ COPIED" : "COPY"}
    </button>
  );
}

// ── TYPEWRITER ────────────────────────────────────────────────────────────────
function Typewriter({ text, speed = 18, onDone }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
        onDone && onDone();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  return <span>{displayed}{!done && <span style={{ color: "#c8b84a", animation: "blink 1s step-end infinite" }}>█</span>}</span>;
}

// ── SECTION CARD ──────────────────────────────────────────────────────────────
function SectionCard({ icon, title, accentColor = "#c8b84a", children, action, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
      background: "#0e0e0b",
      border: `1px solid #2a2a1e`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 3,
      marginBottom: "1rem",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.55rem 1rem",
        borderBottom: "1px solid #1e1e14",
        background: "#0c0c09",
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          color: accentColor,
          textTransform: "uppercase",
        }}>
          {icon} {title}
        </span>
        {action}
      </div>
      <div style={{ padding: "0.9rem 1rem" }}>
        {children}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("as_groq_key") || "");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [situation, setSituation] = useState("");
  const [modifiers, setModifiers] = useState({ field: "", audience: "", tone: "", short: false, twitter: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [bannerDone, setBannerDone] = useState(false);
  const outputRef = useRef(null);

  const LOADING_PHRASES = [
    "Consulting the academic archives...",
    "Cross-referencing departmental precedents...",
    "Calibrating jargon density...",
    "Invoking scholarly circumlocution protocols...",
    "Finalising epistemic repositioning...",
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingPhase(p => (p + 1) % LOADING_PHRASES.length);
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const saveKey = (k) => {
    localStorage.setItem("as_groq_key", k);
    setApiKey(k);
    setShowKeyInput(false);
  };

  const buildPrompt = () => {
    let prompt = situation.trim();
    if (modifiers.field)    prompt += ` /field ${modifiers.field}`;
    if (modifiers.audience) prompt += ` /audience ${modifiers.audience}`;
    if (modifiers.tone)     prompt += ` /tone ${modifiers.tone}`;
    if (modifiers.short)    prompt += ` /short`;
    if (modifiers.twitter)  prompt += ` /twitter`;
    return prompt;
  };

  const handleSubmit = async () => {
    if (!situation.trim()) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    setLoading(true);
    setResult(null);
    setError(null);
    setLoadingPhase(0);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1500,
          temperature: 0.9,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildPrompt() },
          ],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const text = data.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response. Please try again.");
      const parsed = parseResponse(text);
      setResult({ raw: text, parsed });

      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError(e.message || "Something went wrong. The academic archives are temporarily inaccessible.");
    } finally {
      setLoading(false);
    }
  };

  const levelInfo = result?.parsed?.ratingParsed?.level
    ? (LEVEL_COLORS[result.parsed.ratingParsed.level] || LEVEL_COLORS[3])
    : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080806",
      fontFamily: "'IBM Plex Mono', monospace",
      color: "#c8c8a8",
      padding: "2rem 1rem",
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        ::selection { background: #c8b84a33; }
        textarea:focus { outline: none; }
        button:hover { opacity: 0.85; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0e0e0b; }
        ::-webkit-scrollbar-thumb { background: #2a2a1e; border-radius: 3px; }
      `}</style>

      {/* Scanline overlay */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: "none", zIndex: 999,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
      }} />

      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* ── BANNER ── */}
        <div style={{
          border: "1px solid #3a3a20",
          borderRadius: 3,
          padding: "1.5rem",
          marginBottom: "2rem",
          background: "#0b0b08",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: "linear-gradient(90deg, transparent, #c8b84a, transparent)",
          }} />
          <pre style={{
            margin: 0, fontSize: "clamp(0.45rem, 1.5vw, 0.68rem)",
            color: "#c8b84a", lineHeight: 1.4, letterSpacing: "0.02em",
            fontFamily: "'IBM Plex Mono', monospace",
            whiteSpace: "pre-wrap",
          }}>{`╔══════════════════════════════════════════════════════════╗
║              🎓 AcademiaSpeak™ v3.7.1                   ║
║     "Transforming Chaos into Scholarly Discourse"        ║
║                                                          ║
║  Trusted by PhD students in 47 countries.               ║
║  Cited by zero papers. Saved by countless careers.      ║
╚══════════════════════════════════════════════════════════╝`}</pre>

          <div style={{ marginTop: "1.2rem", borderTop: "1px solid #2a2a18", paddingTop: "1rem" }}>
            {!bannerDone ? (
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#a8a880", lineHeight: 1.8, fontFamily: "'IM Fell English', serif", fontStyle: "italic" }}>
                <Typewriter
                  text="Welcome, embattled scholar. Describe your situation below — in plain language, with as much or as little detail as you wish. I will handle the rest."
                  speed={14}
                  onDone={() => setBannerDone(true)}
                />
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#a8a880", lineHeight: 1.8, fontFamily: "'IM Fell English', serif", fontStyle: "italic" }}>
                Welcome, embattled scholar. Describe your situation below — in plain language, with as much or as little detail as you wish. I will handle the rest.
              </p>
            )}
          </div>
        </div>

        {/* ── API KEY SECTION ── */}
        <div style={{ marginBottom: "1.5rem" }}>
          {!showKeyInput && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.6rem", color: "#5a5a3a", letterSpacing: "0.15em" }}>
                API KEY: {apiKey ? "●●●●●●●●●●●●" + apiKey.slice(-4) : "NOT SET — GROQ KEY REQUIRED"}
              </span>
              <button
                onClick={() => setShowKeyInput(true)}
                style={{
                  background: "transparent", border: "1px solid #3a3a20",
                  color: "#7a7a50", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.58rem", letterSpacing: "0.12em",
                  padding: "3px 10px", cursor: "pointer", borderRadius: 2,
                }}>
                {apiKey ? "CHANGE" : "SET KEY"}
              </button>
            </div>
          )}
          {showKeyInput && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="password"
                placeholder="gsk_..."
                defaultValue={apiKey}
                onKeyDown={e => e.key === "Enter" && saveKey(e.target.value)}
                style={{
                  flex: 1, background: "#0c0c09", border: "1px solid #3a3a20",
                  color: "#c8c8a8", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.7rem", padding: "0.5rem 0.75rem", borderRadius: 2,
                }}
                autoFocus
                id="apiKeyInput"
              />
              <button
                onClick={() => saveKey(document.getElementById("apiKeyInput").value)}
                style={{
                  background: "#c8b84a", color: "#08080a",
                  border: "none", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.62rem", letterSpacing: "0.12em",
                  padding: "0.5rem 1rem", cursor: "pointer", borderRadius: 2, fontWeight: 600,
                }}>
                SAVE
              </button>
              <button
                onClick={() => setShowKeyInput(false)}
                style={{
                  background: "transparent", border: "1px solid #3a3a20",
                  color: "#5a5a3a", fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.62rem", padding: "0.5rem 0.75rem", cursor: "pointer", borderRadius: 2,
                }}>
                ✕
              </button>
            </div>
          )}
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.58rem", color: "#3a3a28", letterSpacing: "0.08em" }}>
            Your Groq API key is stored locally in your browser. Never sent anywhere except Groq.
          </p>
        </div>

        {/* ── INPUT ── */}
        <div style={{
          border: "1px solid #2a2a1e",
          borderRadius: 3,
          background: "#0b0b08",
          marginBottom: "1rem",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "0.4rem 0.75rem",
            background: "#0d0d0a",
            borderBottom: "1px solid #1e1e14",
            fontSize: "0.58rem",
            color: "#5a5a3a",
            letterSpacing: "0.15em",
          }}>
            SITUATION INPUT — describe your academic catastrophe below
          </div>
          <textarea
            value={situation}
            onChange={e => setSituation(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
            placeholder="e.g. I haven't read the paper being discussed at today's lab meeting&#10;e.g. I ghosted a collaborator for 4 months&#10;e.g. My HPC job crashed and I lost 3 weeks of data"
            rows={5}
            style={{
              width: "100%", background: "transparent", border: "none",
              color: "#c8c8a8", fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "0.75rem", lineHeight: 1.7, padding: "0.85rem",
              resize: "vertical", minHeight: 100,
            }}
          />
        </div>

        {/* ── MODIFIERS ── */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "0.5rem",
          marginBottom: "1rem",
          padding: "0.75rem",
          background: "#0b0b08",
          border: "1px solid #1e1e14",
          borderRadius: 3,
        }}>
          <span style={{ fontSize: "0.58rem", color: "#4a4a32", letterSpacing: "0.15em", alignSelf: "center", marginRight: "0.25rem" }}>MODIFIERS:</span>
          {[
            { key: "field", placeholder: "/field  e.g. climate science" },
            { key: "audience", placeholder: "/audience  e.g. PI" },
            { key: "tone", placeholder: "/tone  e.g. chaotic" },
          ].map(({ key, placeholder }) => (
            <input
              key={key}
              value={modifiers[key]}
              onChange={e => setModifiers(m => ({ ...m, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{
                background: "#0e0e0b", border: "1px solid #2a2a1a",
                color: "#a8a870", fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.62rem", padding: "0.3rem 0.6rem",
                borderRadius: 2, width: 200,
              }}
            />
          ))}
          {[
            { key: "short", label: "/short" },
            { key: "twitter", label: "/twitter" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setModifiers(m => ({ ...m, [key]: !m[key] }))}
              style={{
                background: modifiers[key] ? "#c8b84a22" : "transparent",
                border: `1px solid ${modifiers[key] ? "#c8b84a" : "#2a2a1a"}`,
                color: modifiers[key] ? "#c8b84a" : "#5a5a3a",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "0.62rem", letterSpacing: "0.1em",
                padding: "0.3rem 0.75rem", cursor: "pointer", borderRadius: 2,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── SUBMIT ── */}
        <button
          onClick={handleSubmit}
          disabled={loading || !situation.trim()}
          style={{
            width: "100%",
            background: loading ? "#1a1a12" : "#c8b84a",
            color: loading ? "#5a5a3a" : "#08080a",
            border: loading ? "1px solid #2a2a1a" : "none",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "0.72rem", fontWeight: 600,
            letterSpacing: "0.2em", textTransform: "uppercase",
            padding: "0.85rem", cursor: loading ? "default" : "pointer",
            borderRadius: 3, marginBottom: "2rem",
            transition: "all 0.2s",
          }}>
          {loading
            ? `⟳  ${LOADING_PHRASES[loadingPhase]}`
            : "REFRAME MY CATASTROPHE  [ ⌘+Enter ]"}
        </button>

        {/* ── ERROR ── */}
        {error && (
          <div style={{
            background: "#1a0a0a", border: "1px solid #7f1d1d",
            borderRadius: 3, padding: "0.85rem 1rem",
            fontSize: "0.7rem", color: "#ef4444", marginBottom: "1.5rem",
          }}>
            ⚠ {error}
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && (
          <div ref={outputRef}>
            <div style={{
              borderTop: "1px solid #2a2a1e", marginBottom: "1.5rem",
              paddingTop: "1.5rem",
            }}>
              <div style={{ fontSize: "0.58rem", color: "#4a4a32", letterSpacing: "0.2em", marginBottom: "1.25rem" }}>
                ── OUTPUT ──────────────────────────────────────────────────
              </div>

              {/* 1. Official Response */}
              {result.parsed.official && (
                <SectionCard
                  icon="🎓" title="THE OFFICIAL RESPONSE"
                  accentColor="#c8b84a" delay={0}
                  action={<CopyButton text={result.parsed.official.replace(/\*\*/g, "")} />}
                >
                  <p style={{ margin: 0, fontSize: "0.75rem", lineHeight: 1.85, color: "#d8d8b8", fontFamily: "'IM Fell English', serif" }}>
                    {result.parsed.official.replace(/\*\*/g, "")}
                  </p>
                </SectionCard>
              )}

              {/* 2. Scientific Reframe */}
              {result.parsed.reframe && (
                <SectionCard icon="🔬" title="THE SCIENTIFIC REFRAME" accentColor="#7dd3fc" delay={150}>
                  <p style={{ margin: 0, fontSize: "0.72rem", lineHeight: 1.8, color: "#a8cce8", fontStyle: "italic", fontFamily: "'IM Fell English', serif" }}>
                    {result.parsed.reframe.replace(/\*\*/g, "")}
                  </p>
                </SectionCard>
              )}

              {/* 3. Translation */}
              {result.parsed.translationText && (
                <SectionCard icon="😅" title="THE TRANSLATION" accentColor="#86efac" delay={300}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.6rem", color: "#4a4a32", letterSpacing: "0.1em", flexShrink: 0, paddingTop: "0.2rem" }}>WHAT THIS ACTUALLY MEANS:</span>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#86efac", fontStyle: "italic", lineHeight: 1.7, fontFamily: "'IM Fell English', serif" }}>
                      "{result.parsed.translationText}"
                    </p>
                  </div>
                </SectionCard>
              )}

              {/* 4. Defense Shield */}
              {result.parsed.shieldLines && (
                <SectionCard icon="🛡️" title="THE DEFENSE SHIELD" accentColor="#f9a8d4" delay={450}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {[
                      { key: "safe",    icon: "🟢", label: "SAFE",    color: "#86efac" },
                      { key: "bold",    icon: "🟡", label: "BOLD",    color: "#fde047" },
                      { key: "nuclear", icon: "🔴", label: "NUCLEAR", color: "#fca5a5" },
                    ].map(({ key, icon, label, color }) => result.parsed.shieldLines[key] && (
                      <div key={key} style={{
                        display: "flex", alignItems: "flex-start", gap: "0.75rem",
                        padding: "0.6rem 0.75rem",
                        background: "#0d0d0a", borderRadius: 2,
                        border: "1px solid #1e1e14",
                      }}>
                        <span style={{ fontSize: "0.58rem", color, letterSpacing: "0.12em", flexShrink: 0, paddingTop: "0.2rem", minWidth: 56 }}>
                          {icon} {label}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#c8c8a8", lineHeight: 1.7, fontFamily: "'IM Fell English', serif", fontStyle: "italic" }}>
                          {result.parsed.shieldLines[key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* 5. Crisis Rating */}
              {result.parsed.ratingParsed && levelInfo && (
                <SectionCard icon="🏅" title="CRISIS SEVERITY RATING" accentColor={levelInfo.border} delay={600}>
                  <div style={{
                    background: levelInfo.bg,
                    border: `1px solid ${levelInfo.border}33`,
                    borderRadius: 3, padding: "0.85rem 1rem",
                    marginBottom: "0.75rem",
                    display: "flex", alignItems: "center", gap: "1rem",
                  }}>
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontSize: "1.8rem", lineHeight: 1, color: levelInfo.text, fontWeight: 600 }}>
                        {result.parsed.ratingParsed.level}
                      </div>
                      <div style={{ fontSize: "0.48rem", color: levelInfo.text, letterSpacing: "0.15em", marginTop: "0.2rem" }}>
                        LEVEL
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.62rem", color: levelInfo.text, letterSpacing: "0.15em", marginBottom: "0.3rem" }}>
                        {result.parsed.ratingParsed.class || levelInfo.label}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#a8a880", fontFamily: "'IM Fell English', serif", fontStyle: "italic", lineHeight: 1.6 }}>
                        {result.parsed.ratingParsed.verdict}
                      </div>
                    </div>
                  </div>

                  {result.parsed.ratingParsed.timeline && (
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.58rem", color: "#4a4a32", letterSpacing: "0.12em", flexShrink: 0, paddingTop: "0.2rem" }}>RECOVERY:</span>
                      <span style={{ fontSize: "0.7rem", color: "#c8c8a8" }}>{result.parsed.ratingParsed.timeline}</span>
                    </div>
                  )}

                  {result.parsed.ratingParsed.advice && (
                    <div style={{
                      borderTop: "1px solid #2a2a1e", paddingTop: "0.65rem", marginTop: "0.65rem",
                      display: "flex", gap: "0.6rem", alignItems: "flex-start",
                    }}>
                      <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>💛</span>
                      <p style={{ margin: 0, fontSize: "0.72rem", color: "#a8a870", lineHeight: 1.75, fontFamily: "'IM Fell English', serif", fontStyle: "italic" }}>
                        {result.parsed.ratingParsed.advice}
                      </p>
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Try again */}
              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <button
                  onClick={() => { setResult(null); setSituation(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  style={{
                    background: "transparent", border: "1px solid #2a2a1e",
                    color: "#5a5a3a", fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "0.62rem", letterSpacing: "0.15em",
                    padding: "0.5rem 1.5rem", cursor: "pointer", borderRadius: 2,
                  }}>
                  ↑ NEW CATASTROPHE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{
          borderTop: "1px solid #1a1a12", marginTop: "3rem", paddingTop: "1rem",
          fontSize: "0.55rem", color: "#2a2a1e", letterSpacing: "0.1em",
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
        }}>
          <span>AcademiaSpeak™ v3.7.1 — Powered by Llama 3.3 via Groq</span>
          <span>Cited by zero papers. Saved by countless careers.</span>
        </div>
      </div>
    </div>
  );
}
