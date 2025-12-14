# OneShot. 📸


**One Day. One Post. One Shot.**


OneShot is a full-stack social media application that challenges the "infinite scroll" loop. It enforces a strict "scarcity" mechanic: users are limited to **one post, one like, and one comment every 24 hours**.


Built with a focus on clean architecture, hybrid cloud storage, and a responsive modern UI.


![Project Status](https://img.shields.io/badge/status-active-success)

![Python](https://img.shields.io/badge/python-3.14-blue)

![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal)

![React](https://img.shields.io/badge/React-18-cyan)


## 🚀 Features


* **Daily Constraints:** Custom backend logic (`check_daily_limit`) enforces a strict 24-hour reset on all interactions.

* **Hybrid Storage Engine:** Automatically uploads images to **Cloudflare R2** buckets, with a seamless fallback to local storage if cloud credentials are missing.

* **Secure Authentication:** JWT-based auth flow (Login/Register) with bcrypt password hashing.

* **Modern Frontend:** Built with React + TailwindCSS, featuring "Flip Card" authentication and optimistic UI updates.

* **Database:** Async SQLAlchemy supporting both SQLite (Dev) and PostgreSQL (Production).


## 🛠️ Tech Stack


* **Backend:** Python 3.14, FastAPI, SQLAlchemy (Async), Pydantic V2

* **Frontend:** React (Vite), TailwindCSS, Lucide Icons

* **Storage:** Cloudflare R2 (AWS S3 Compatible SDK)

* **Deployment:** Render (PostgreSQL + Web Service)


## 📂 Project Structure
```text
├── Back/
│   ├── models.py        # Database Schema (User, Shot, Comment, Like)
│   ├── auth.py          # JWT Handler & Hashing
│   ├── storage.py       # R2 Cloud Upload + Local Fallback logic
│   ├── handle.py        # Daily Limit Logic
│   ├── database.py      # Async Database Connection & Session
│   └── app.py           # Main Application & API Endpoints
├── front/
│   ├── src/components/  # ShotCard, AuthScreen, Toast
│   └── ...
├── .env                 # Environment variables
├── requirements.txt     # Python dependencies
└── main.py              # Entry point

```


## ⚡ Installation & Setup

### Prerequisites
* Python **3.14**
* Node.js & npm

### 1. Clone the Repository

```bash
git clone <https://github.com/YammahTea/oneshot>
cd oneshot
```

### 2. Backend Setup
Create a virtual environment and install dependencies.

```bash
# Create virtual env
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Configuration (.env)
Create a .env file in the root directory. You must add these keys for the app to function:
```text
# Database (Defaults to local SQLite if not set to Postgres)
DATABASE_URL="sqlite+aiosqlite:///./oneshot.db"

# Authentication Secrets
AUTH_SECRET_KEY="change_this_to_a_random_secret_string"
AUTH_ALGORITHM="HS256"
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Cloudflare R2 Storage (Optional - leave empty to use local storage)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```
#### Run the backend server
```bash
uvicorn Back.app:app --reload
```

### 3. Frontend Setup
#### Open a new terminal and navigate to the front folder.
```bash
cd front
npm install
```

#### Configuration (.env)
Create a .env file in the front/ directory:
```text
VITE_API_URL="http://localhost:8000"
```

#### Run the frontend development server:
```bash
npm run dev
```

## 📸 Usage
```text
1- Register: Create a new account.

2- Shoot: Upload your One Shot for the day (Image + Caption).

3- Interact: Like or Comment on one other user's post.

4- Wait: Try to post again, the system will block you until the next day!
```
