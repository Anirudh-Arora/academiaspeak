# 🎓 AcademiaSpeak™ v3.7.1
> *"Transforming Chaos into Scholarly Discourse"*

Trusted by PhD students in 47 countries. Cited by zero papers. Saved by countless careers.

AcademiaSpeak™ transforms your academic catastrophes — missed deadlines, crashed HPC jobs, unread papers, ghosted collaborators — into masterfully crafted, jargon-rich responses that are simultaneously hilarious and genuinely usable.

---

## What It Does

Paste in your situation. Get back:

1. **🎓 The Official Response** — a ready-to-send, jargon-dense email or message
2. **🔬 The Scientific Reframe** — your disaster, rendered as a journal abstract finding
3. **😅 The Translation** — what you actually mean, in brutal plain English
4. **🛡️ The Defense Shield** — three one-liners ranked Safe / Bold / Nuclear
5. **🏅 Crisis Severity Rating** — level 1–5 triage, recovery timeline, and one genuine piece of advice

### Special Modifiers
- `/field climate science` — tailors jargon to your discipline
- `/audience PI` — customises tone for a specific recipient
- `/tone chaotic` — adjusts register from professional to unhinged-but-brilliant
- `/short` — returns only the Official Response + Translation
- `/twitter` — reformats everything as a viral academic thread

---

## Stack

- React 18 (Create React App)
- Claude API (`claude-sonnet-4-20250514`) via direct fetch
- No backend — fully client-side
- API key stored in `localStorage` (never leaves your browser)

---

## Local Development

```bash
# 1. Clone or download this repo
git clone https://github.com/YOUR_USERNAME/academiaspeak.git
cd academiaspeak

# 2. Install dependencies
npm install

# 3. Start dev server
npm start
# Opens at http://localhost:3000
```

When the app loads, click **SET KEY** and enter your Anthropic API key (`sk-ant-...`).  
Get one at: https://console.anthropic.com

---

## Deploy to GitHub Pages

### One-time setup

**Step 1** — Create a new GitHub repo named `academiaspeak` (public or private).

**Step 2** — Update `package.json`. Replace the homepage line with your actual username:
```json
"homepage": "https://YOUR_GITHUB_USERNAME.github.io/academiaspeak"
```

**Step 3** — Install the deploy tool:
```bash
npm install
```

**Step 4** — Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/academiaspeak.git
git push -u origin main
```

**Step 5** — Deploy:
```bash
npm run deploy
```

This builds the app and pushes it to a `gh-pages` branch automatically.

**Step 6** — Enable GitHub Pages in your repo:
- Go to repo → Settings → Pages
- Source: `Deploy from a branch`
- Branch: `gh-pages` / `/ (root)`
- Save

Your app will be live at: `https://YOUR_USERNAME.github.io/academiaspeak`  
(Takes ~2 minutes to propagate the first time.)

### Subsequent deploys
```bash
npm run deploy
```
That's it. One command.

---

## API Key & Privacy

- The Anthropic API key is entered in-browser and stored in `localStorage`
- It is sent **only** to `api.anthropic.com` — never to any intermediate server
- Users of your deployed app will need to enter their own API key
- To make it keyless for end users, you'd need to add a backend proxy (not included here)

---

## Customisation

All the personality, output format, and rules live in the `SYSTEM_PROMPT` constant at the top of `src/App.js`. Edit it freely to adjust tone, add new sections, or specialise for a particular field.

---

## Project Structure

```
academiaspeak/
├── public/
│   └── index.html
├── src/
│   ├── App.js        ← Everything lives here
│   └── index.js
├── package.json
└── README.md
```

---

*Academia gave us the jargon. We're just using it defensively.*
