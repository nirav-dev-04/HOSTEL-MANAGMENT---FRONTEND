# 🏠 Hostel Management System — Frontend

A role-based hostel management platform built to streamline student and hostel administration processes — student registration, complaint management, and role-specific dashboards for Students, Rectors, and Admins.

🔗 **Live Demo:** [hostel-managment-frontend.vercel.app](https://hostel-managment-frontend.vercel.app/login)
🔗 **Backend Repo:** [Add backend repo link here]

---

## ✨ Features

- 🔐 Role-based authentication (Student / Rector / Admin)
- 📋 Student registration & login
- 📢 Complaint management system
- 🎓 Student Dashboard
- 🛡 Rector Dashboard
- ⚙️ Admin Dashboard
- 📱 Fully responsive UI (mobile sidebar drawer, horizontal table scroll)
- 🔗 REST API integration with Spring Boot backend

---

## 🛠 Tech Stack

- **Framework:** React (Vite)
- **Styling:** CSS / Tailwind (update if different)
- **Routing:** React Router
- **HTTP Client:** Axios
- **Deployment:** Vercel

---

## 📂 Project Structure

```
HOSTEL-MANAGMENT---FRONTEND/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/       # API calls
│   └── App.jsx
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Installation

```bash
git clone https://github.com/nirav-dev-04/HOSTEL-MANAGMENT---FRONTEND.git
cd HOSTEL-MANAGMENT---FRONTEND
npm install
```

### Run Locally

```bash
npm run dev
```

App runs at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the root and add:

```
VITE_API_BASE_URL=<your-backend-api-url>
```

### Build for Production

```bash
npm run build
```

---

## 🔗 Backend

This frontend connects to a Spring Boot REST API handling authentication, complaints, and dashboard data.
Backend repo: [Add link here]

---

## 👤 Author

**Nirav Mathukiya**
[LinkedIn](https://www.linkedin.com/in/nirav-mathukiya-47b1752b3) | [GitHub](https://github.com/nirav-dev-04)
