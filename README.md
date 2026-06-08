# ⬡ ProjectHub

A beautiful **glassmorphic** desktop app for managing all your local projects — Python scripts, PyQt5 apps, HTML+backend tools, Node servers, shell scripts — all in one place.

---

## ✨ Features

- **Project Cards** — glassmorphic cards with status indicators, emoji icons, color accents
- **One-click Run/Stop** — launch any project with its configured command; kill it just as fast
- **Live Output Panel** — real-time stdout/stderr per project with timestamps and input sending
- **Built-in Terminal** — multi-tab terminal with command history and per-project CWD
- **Auto-detection** — drop a folder path and it detects Python/Node/Web projects and pre-fills the run command
- **Smart Filters** — filter by type (Python, Node, Web…) or your own tags
- **Search** — fuzzy search across names, descriptions, tags
- **Right-click context menu** — Run, View Output, Open Folder, Open in Terminal, Edit, Delete
- **Data persistence** — projects saved to your OS user-data folder
- **Grid / List layout toggle**

### Completed Feature Checklist

- [x] Project cards
- [x] One-click run and stop
- [x] Live output panel
- [x] Built-in terminal
- [x] Project auto-detection
- [x] Type and tag filters
- [x] Project search
- [x] Right-click context menu
- [x] Local project persistence
- [x] Grid and list layout toggle
- [x] Project path and command validation

---

## 🚀 Quick Start (Development)

### Prerequisites
- **Node.js** 18+ and npm
- **Git** (optional)

### Install & Run

```bash
# 1. Enter the project folder
cd projecthub

# 2. Install dependencies
npm install

# 3. Launch the app
npm start
```

---

## Documentation

- [Roadmap](docs/ROADMAP.md) - prioritized implementation plan for upcoming work.
- [Feature gaps](docs/FEATURE_GAPS.md) - missing capabilities and why they matter.

That's it — the glassmorphic window will appear!

---

## 📦 Build a Native App

### Linux (AppImage)
```bash
npm run build:linux
# Output: dist/ProjectHub-1.0.0.AppImage
```
Make it executable and run:
```bash
chmod +x dist/ProjectHub-*.AppImage
./dist/ProjectHub-*.AppImage
```

### macOS (DMG)
```bash
npm run build:mac
```

### Windows (Installer)
```bash
npm run build:win
```

---

## 🖥 Usage

### Adding a Project
1. Click **＋ Add Project** in the sidebar (or the button in the empty state)
2. Fill in the name, paste the folder path (or Browse), and click **Auto-detect** to auto-fill the run command
3. Optionally add a description, emoji icon, color accent, and tags
4. Click **Save Project**

### Running a Project
- Click **▶ Run** on any card (or right-click → Run)
- The app spawns the command in your project's folder
- The card turns green with a pulsing dot
- Output streams live in the **Running / Output** view

### Built-in Terminal
- Click **Terminal** in the sidebar
- Type commands — output streams back in real-time
- Use **↑ / ↓** for command history
- Click **＋** for new terminal tabs
- Right-click any project → **Open in Terminal** to cd into that project automatically

### Project Types Supported
| Type | Example command |
|------|----------------|
| 🐍 Python | `python main.py` or `python -m flask run` |
| ⬡ Node.js | `npm start` or `node server.js` |
| 🌐 Web | `python -m http.server 8080` |
| 🖼 PyQt/Tkinter | `python app.py` |
| 🔧 Shell | `bash run.sh` |
| 📦 Other | Any shell command |

---

## 📁 Data Storage

Projects are stored as JSON at:
- **Linux/Mac**: `~/.config/ProjectHub/projects.json`
- **Windows**: `%APPDATA%\ProjectHub\projects.json`

---

## 🛠 Tech Stack

- **Electron** — cross-platform desktop shell
- **Vanilla JS** — no framework, fast and lean
- **Syne + JetBrains Mono** — typography
- **CSS glassmorphism** — `backdrop-filter`, gradient meshes, dot-grid overlay
- **Node.js child_process** — spawning and managing project processes

---

## 🎨 Customization

Edit `src/index.html` CSS variables at the top to change the color scheme:

```css
:root {
  --accent-1: #a78bfa;   /* Purple — primary accent */
  --accent-2: #38bdf8;   /* Blue */
  --accent-3: #fb7185;   /* Pink/red */
  --accent-green: #4ade80; /* Running indicator */
}
```
