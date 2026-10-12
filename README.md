# 🎓 Student Vault

A modern, secure web application designed for students to manage, organize, and showcase their academic portfolio — certificates, project work, technical skill stacks, and student credentials in one centralized vault.

Built with **React 19**, **Tailwind CSS v4**, **Vite**, and **Supabase (PostgreSQL + Auth + Storage)** with full **Row Level Security (RLS)**.

---

## 🌟 Key Features

### 📊 Comprehensive Dashboard
- Instant metrics summarizing total verified certificates and documented projects.
- Quick action buttons to add credentials and project artifacts directly from the home view.

### 📜 Certificate Management
- **File Upload & Storage**: Securely upload certificate documents (PDFs, images) directly to Supabase Storage.
- **Categorization**: Dynamically organize certifications by domain or category (e.g., *Web Development*, *Cloud Computing*, *Machine Learning*).
- **Download & Inspect**: One-click download and review of stored certificates.

### 💼 Project Showcase & Tech Stacks
- **Academic & Personal Projects**: Document project titles, descriptions, and duration timelines.
- **Relational Technology Stacks**: Assign multiple technologies and student roles (e.g., *Frontend Developer*, *Lead Engineer*, *DevOps*) per project using a relational mapping (`USES` and `TECHNOLOGY` tables).
- **Project Deliverables**: Upload and link project reports, source archives, or design documents.

### 👤 Student Profile & Contact Directory
- **Academic Credentials**: Edit first name, last name, and department/major with quick-suggestion chips.
- **Multivalued Phone Numbers**: Manage multiple contact numbers (primary, secondary, emergency) linked directly to your student ID.
- **Security & Password Management**: In-app password updates via Supabase Auth with validation and visibility toggles.
- **Copyable Student UUID**: Rapid one-click copy of unique student identifier for university forms and verification.

### 🔒 Enterprise-Grade Security
- **Supabase Authentication**: Secure email and password signup & login flows.
- **Row Level Security (RLS)**: Strict PostgreSQL security policies ensure each student can only view, create, update, and delete their own records.
- **User-Isolated Storage**: Dedicated storage bucket policies restrict file access to the authenticated student's unique folder.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) |
| **Routing** | [React Router DOM v7](https://reactrouter.com/) |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Storage & Auth** | Supabase Storage (`student-files`), Supabase Auth |
| **Linter** | [Oxlint](https://oxc.rs/) |

---

## 🗄️ Database Schema Overview

Student Vault utilizes a relational PostgreSQL database schema defined in [`database.sql`](./database.sql):

- **`STUDENT`**: Core student profile records linked to Supabase Auth (`student_id` maps to `auth.uid()`).
- **`STUDENT_PHONE`**: Multivalued relation for storing multiple contact numbers per student.
- **`CATEGORY`**: User-defined classification categories for certificates.
- **`CERTIFICATE`**: Certificate records with issuer details, dates, category foreign keys, and storage paths.
- **`PROJECT`**: Project records with start/end timelines, descriptions, and storage file references.
- **`TECHNOLOGY`**: Global registry of technologies, frameworks, and programming languages.
- **`USES`**: Junction entity linking projects and technologies with custom student roles.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A free [Supabase](https://supabase.com/) account and project

---

### 1. Clone the Repository

```bash
git clone https://github.com/PrimeKartik/StudentVault.git
cd StudentVault
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Supabase & Database

1. Navigate to your [Supabase Dashboard](https://app.supabase.com/) and open your project.
2. Go to the **SQL Editor** tab.
3. Open [`database.sql`](./database.sql) from this repository, copy its contents, paste them into the SQL editor, and run the script. This will:
   - Create all tables (`STUDENT`, `STUDENT_PHONE`, `CATEGORY`, `CERTIFICATE`, `PROJECT`, `TECHNOLOGY`, `USES`).
   - Enable Row Level Security (RLS) on all tables.
   - Apply user-specific access control policies.
   - Configure the `student-files` storage bucket and file access policies.

---

### 4. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Note:** Find your Project URL and Anon Key in your Supabase Project Settings under **API**.

---

### 5. Run the Application Locally

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173` to explore Student Vault.

---

## 📦 Available Scripts

- **`npm run dev`**: Starts the local development server with Vite HMR.
- **`npm run build`**: Compiles the production bundle into the `dist/` directory.
- **`npm run preview`**: Locally previews the production build.
- **`npm run lint`**: Runs Oxlint for code quality and static analysis.

---

## 📂 Project Structure

```text
StudentVault/
├── database.sql            # PostgreSQL schema, RLS policies, & bucket config
├── index.html              # HTML entry point
├── package.json            # Dependencies and npm scripts
├── vite.config.js          # Vite configuration
├── src/
│   ├── App.jsx             # Route definitions & protected route wrappers
│   ├── main.jsx            # React root mount
│   ├── index.css           # Tailwind CSS imports & theme configurations
│   ├── components/
│   │   └── Layout.jsx      # Dashboard sidebar navigation & layout shell
│   ├── contexts/
│   │   └── AuthContext.jsx # Global Supabase authentication provider
│   ├── lib/
│   │   └── supabase.js     # Supabase client initialization
│   └── pages/
│       ├── Dashboard.jsx   # Metrics overview & quick links
│       ├── Certificates.jsx# Certificate upload, categorization & download
│       ├── Projects.jsx    # Projects management & technology roles
│       ├── Profile.jsx     # Student details, phone directory & password updates
│       ├── Login.jsx       # Student authentication login
│       └── Register.jsx    # New student registration & profile creation
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
