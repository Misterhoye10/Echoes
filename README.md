# Echoes — The Memories That Stay 🌾🕊️

> **A Private, AI-Powered Memory Archive Honoring the People We Love**  
> *Built for DEV Community Hacktoberfest 2026 Week 4 Challenge: Ghost in the Machine (#devchallenge #hf26challenge).*

---

![Echoes Sunset Sanctuary](public/sunset.jpg)

## 🕊️ What is Echoes?

> *"Because some voices deserve to live beyond a lifetime."*

Every family carries an irreplaceable library of voices, stories, laughter, and generational wisdom:
- A mother's favorite bedtime lullaby and her secret recipe whispered on Sunday mornings.
- A sister's contagious laugh and her quiet advice on courage.
- An elder's weathered hands and their lessons on resilience.

Too often, when the people we love pass away, their voices and stories fade from living memory. **Echoes** is an enduring digital sanctuary designed to preserve family voices, life lessons, photographs, and oral histories before they disappear.

### Our Core Philosophy: Authentic Remembrance, Never Artificial Imitation
Echoes explicitly **does not** create synthetic chatbots that simulate or impersonate the deceased. There is something deeply disrespectful and uncanny about algorithmic grief bots. Instead, Echoes keeps their **real voice recordings, exact words, photographs, and authentic wisdom** safely guarded under sovereign family ownership.

---

## 🚀 One-Click Deploy to Render

Deploy Echoes directly to Render as a full-stack Web Service:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Misterhoye10/Echoes)

### Required Environment Variables on Render:
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key for commemorative voice narration.
- `ELEVENLABS_DEFAULT_VOICE_ID`: `JBFqnCBsd6RMkjVDRZzb` (or your preferred voice).
- `GROQ_API_KEY`: Groq API key for ultra-fast open-weight AI wisdom extraction.
- `NODE_ENV`: `production`

---

## ✨ Key Features

1. **🎙️ ElevenLabs Commemorative Voice Narration ("Remembrance Voice")**:
   - Every preserved memory story can be narrated aloud with neural speech from ElevenLabs (`eleven_turbo_v2_5`), allowing families to hear stories read in a gentle, warm tone.
   - Pre-loaded with authentic heirloom stories (e.g. *Mom's childhood stories*, *Grandma's lasagna recipe*, *Dad's life advice on courage*).

2. **🧠 Open-Weight AI Wisdom & Tribute Extraction**:
   - Powered by genuine open-weight models (`qwen/qwen3.8-27b`) on lightning-fast **Groq LPU inference**.
   - Extracts the core **Life Lesson**, generates a respectful **Memorial Tribute**, and organizes memories with **Heirloom Tags**.

3. **🎵 "See You Again" Piano Instrumental**:
   - Built-in studio instrumental of Wiz Khalifa & Charlie Puth's iconic *"See You Again"*.
   - Toggle audio directly from the minimalist sound wave icon in the top header.

4. **🎙️ In-Browser High-Fidelity Voice Recording**:
   - Capture authentic spoken stories directly from your microphone with live elapsed timers.
   - Includes **Pause/Resume**, **Restart/Re-record**, and **Cancel/Discard** controls.

5. **🔒 Sovereign Privacy & Security**:
   - Strict user isolation: users only see and manage their own private family memories.
   - Offline-ready crypto session authentication with zero external corporate database tracking.

---

## 🛠️ Technology Stack

- **Full-Stack Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.
- **Voice Narration**: ElevenLabs Neural Text-to-Speech API (`eleven_turbo_v2_5`).
- **Open-Weight AI**: Groq Cloud LPU (`qwen/qwen3.8-27b`).
- **Audio & Media**: Web Audio API, MediaRecorder API, HTML5 Audio.
- **Deployment**: Render Web Service (`render.yaml`).

---

## 🚀 Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/Misterhoye10/Echoes.git
cd Echoes

# 2. Install dependencies
npm install

# 3. Configure environment variables in .env.local
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_DEFAULT_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
GROQ_API_KEY=your_groq_key

# 4. Start local development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🏆 Hackathon Tracks & Categories

- **Primary Challenge**: *Ghost in the Machine* (Honoring the past in the spirit of Día de los Muertos).
- **Partner Prize Tracks**:
  - 🎙️ **Best Use of ElevenLabs** ($100 USD)
  - 🧠 **Best Use of Gemma / Open-Weight AI** ($200 USD)
  - 🚀 **Best Use of Render** ($200 USD)

---

## 🕯️ In Memoriam
*Dedicated with eternal love and reverence to mothers, sisters, and elders whose voices and wisdom deserve to live beyond a lifetime.* ❤️
