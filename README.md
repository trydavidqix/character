# Character & Buzzy Studio

> **Unified platform for consistent AI characters and cinematic scene storyboards.**
> Combines the persona definition & dialogue engine of **Character.ai** with the scene direction & shot consistency canvas of **Buzzy.now**.

---

## 🌟 Key Features

1. **Character Lab (Character.ai Style):**
   - **Identity Anchors:** Enforces immutable physical traits (hair, eyes, skin, facial structure) and accessories (e.g. hoop earrings, spectacles).
   - **Negative Filter Protection:** Eliminates forbidden attributes (tattoos, piercings, hair color shifts) automatically.
   - **Persona Dialogue Simulator:** Interactive testing with character personas, including in-browser voice synthesis.

2. **Scene & Shot Studio (Buzzy.now Style):**
   - **Cinematic Storyboard:** Visual graph and sequence of scene shots.
   - **Art Director Controls:** Framing presets (close-up, waist-up, full body), camera angles (straight on, 45º profile), and optical lighting parameters (direct hard sunlight, golden hour, studio rim light).
   - **Prompt Consistency Compiler:** Formats prompts in authentic English conforming strictly to Google Flow / Nano Banana guidelines, automatically attaching required reference image IDs.

3. **100% Cloud-Centric (Zero Local Hardware Burden):**
   - No local GPU or heavy models required.
   - Runs with ultra-lightweight client footprint (<80MB RAM in browser).
   - Automated CI testing on **GitHub Actions** with every commit.

---

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/trydavidqix/character.git
cd character
npm install
```

### Run Locally (Development)

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Build for Production

```bash
npm run build
```

---

## 🧪 Automated Testing on GitHub Actions

Every commit to `main` executes the `.github/workflows/ci.yml` pipeline:
- **TypeScript strict type checking** (`npx tsc --noEmit`)
- **Vitest unit tests** (validating character identity anchors, forbidden term stripping, and reference image attachment)
- **Production web build**

---

## 📄 License

MIT © [David](https://github.com/trydavidqix)
