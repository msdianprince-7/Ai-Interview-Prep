# 🤖 AI Interview Prep — AI-Powered Interview Preparation Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-blue?style=for-the-badge)](https://ai-interview-prep-inky-sigma.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-green?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

> A full-stack SaaS platform where developers can practice technical interviews with an AI interviewer, receive real-time feedback, upload their resume for personalized questions, and track their performance over time.

---

## 🌐 Live Demo

**[https://ai-interview-prep-inky-sigma.vercel.app](https://ai-interview-prep-inky-sigma.vercel.app)**

---

## ✨ Features

- 🔐 **Authentication** — Secure email/password login and registration with NextAuth.js v5
- 🤖 **AI Interviewer** — AI generates role-specific technical interview questions using Groq (LLaMA 3.1)
- 🎤 **Voice Interview Mode** — Speak your answers using Web Speech API with real-time transcription and AI text-to-speech questions
- 📝 **Answer Evaluation** — Every answer is evaluated with a score out of 10, strengths, and improvement areas
- 📄 **Resume Upload** — Upload your PDF resume to get personalized questions based on your experience
- 📋 **Interview History** — Review all past interviews, questions, answers, and feedback
- 📊 **Analytics Dashboard** — Visual charts showing score trends, performance by role and difficulty
- 🎯 **Role-Specific Questions** — Frontend, Backend, Full Stack, DevOps, Data Science, and more
- 📈 **Progress Tracking** — Track improvement across multiple interview sessions

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL (Neon) |
| **ORM** | Prisma |
| **Authentication** | NextAuth.js v5 |
| **AI / LLM** | Groq API (LLaMA 3.1 8B) |
| **Voice** | Web Speech API + react-speech-recognition |
| **Styling** | Tailwind CSS v4 + Inline Styles |
| **PDF Parsing** | unpdf |
| **Deployment** | Vercel |

---

## 📸 Screenshots


### Landing Page
![Landing Page](https://raw.githubusercontent.com/msdianprince-7/Ai-Interview-Prep/master/public/screenshots/Screenshot%202026-03-15%20112000.png)

### Dashboard
![Dashboard](https://raw.githubusercontent.com/msdianprince-7/Ai-Interview-Prep/master/public/screenshots/Screenshot%202026-03-15%20112421.png)

### Interview Room
![Interview Room](https://raw.githubusercontent.com/msdianprince-7/Ai-Interview-Prep/master/public/screenshots/Screenshot%202026-03-15%20112717.png)

### Text Mode
![Text Mode](https://raw.githubusercontent.com/msdianprince-7/Ai-Interview-Prep/master/public/screenshots/Screenshot%202026-03-20%20111305.png)

### Voice Mode
![Voice Mode](https://raw.githubusercontent.com/msdianprince-7/Ai-Interview-Prep/master/public/screenshots/Screenshot%202026-03-20%20111425.png)

### Analytics Dashboard
![Analytics](https://raw.githubusercontent.com/msdianprince-7/Ai-Interview-Prep/master/public/screenshots/Screenshot%202026-03-15%20112824.png)
## 🗄️ Database Schema

```
User
 ├── id, name, email, password
 ├── Interviews[]
 └── Resumes[]

Interview
 ├── id, role, difficulty, status
 ├── score, feedback
 ├── createdAt, completedAt
 └── Questions[]

Question
 ├── id, content, answer
 ├── score, feedback
 └── order

Resume
 ├── id, filename
 └── content (parsed text)
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+
- PostgreSQL database (or free [Neon](https://neon.tech) account)
- [Groq API key](https://console.groq.com) (free)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/msdianprince-7/Ai-Interview-Prep.git
cd Ai-Interview-Prep
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Create a `.env` file in the root directory:
```env
DATABASE_URL="your_postgresql_connection_string"
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="your_auth_secret"
GROQ_API_KEY="your_groq_api_key"
```

**4. Run database migrations**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**5. Start the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Login page
│   │   └── register/       # Register page
│   ├── (dashboard)/
│   │   ├── dashboard/      # Main dashboard
│   │   ├── interview/
│   │   │   ├── new/        # Start new interview
│   │   │   └── [id]/       # Active interview room
│   │   ├── history/        # Interview history
│   │   ├── analytics/      # Analytics dashboard
│   │   └── resume/         # Resume upload
│   ├── api/
│   │   ├── auth/           # NextAuth routes
│   │   ├── interview/      # Interview CRUD + AI
│   │   ├── interviews/     # Interview list
│   │   ├── register/       # User registration
│   │   └── resume/         # Resume upload & parse
│   ├── layout.tsx
│   └── page.tsx            # Landing page
├── auth.ts                 # NextAuth configuration
└── lib/
    ├── openai.ts           # Groq AI functions
    └── prisma.ts           # Prisma client
```

---

## 🔑 Key Implementation Details

### AI Question Generation
Questions are generated using the Groq API with LLaMA 3.1 8B model. The prompt includes the target role, difficulty level, previously asked questions (to avoid repetition), and resume content for personalization.

### AI Answer Evaluation
Each answer is evaluated by the AI with strict scoring guidelines — vague or incorrect answers receive low scores (1-2), while well-explained answers with correct concepts receive high scores (8-10).

### Resume Personalization
PDF resumes are parsed using `unpdf` and the extracted text is sent as context to the AI, which then generates questions relevant to the candidate's actual experience and tech stack.

### Authentication Flow
Uses NextAuth.js v5 with JWT strategy. Passwords are hashed with bcryptjs before storage. Sessions are validated on every protected API route.

---

## 🌱 Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret for NextAuth session encryption |
| `NEXTAUTH_URL` | Base URL of your application |
| `AUTH_SECRET` | Auth.js secret key |
| `GROQ_API_KEY` | Groq API key for AI features |

---

## 🚢 Deployment

This project is deployed on **Vercel** with a **Neon PostgreSQL** database.

To deploy your own instance:
1. Fork this repository
2. Create a Vercel account and import the repo
3. Add all environment variables in Vercel dashboard
4. Deploy — Vercel auto-detects Next.js configuration

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**msdianprince-7**
- GitHub: [@msdianprince-7](https://github.com/msdianprince-7)
- Live Project: [ai-interview-prep-inky-sigma.vercel.app](https://ai-interview-prep-inky-sigma.vercel.app)

---

<div align="center">
  <p>Built with ❤️ using Next.js, Prisma, NextAuth, and Groq AI</p>
  <p>⭐ Star this repo if you found it helpful!</p>
</div>
