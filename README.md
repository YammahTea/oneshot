# OneShot. 📸


**One Day. One Post. One Shot.**


OneShot is a full-stack social media application that challenges the "infinite scroll" loop. It enforces a strict "scarcity" mechanic: users are limited to **one post, one like, and one comment every 24 hours**.


Built with a focus on clean architecture, hybrid cloud storage, and a responsive modern UI.


![Project Status](https://img.shields.io/badge/status-active-success)

![Python](https://img.shields.io/badge/python-3.14-blue)

![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal)

![React](https://img.shields.io/badge/React-18-cyan)

![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

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

* **Infrastructure:** Docker, Docker Compose, PostgreSQL (Containerized), Redis (Containerized)

* **Deployment:** Render (PostgreSQL + Web Service)

## 📂 Project Structure
```text
├── Back/
│   ├── core/                # Core Configuration
│   │   ├── database.py      # Async Database & Session
│   │   ├── models.py        # DB Schema
│   │   └── storage.py       # Hybrid Storage (R2 + Local Fallback)
│   ├── services/            # Business Logic
│   │   ├── auth.py          # JWT Handling & Hashing
│   │   ├── handle.py        # Daily Limit Logic
│   │   ├── rate_limiter.py  # Redis Cooldowns
│   │   └── redis_client.py  # Connection Pool
│   ├── routers/            # Endpoint Routes
│   │   ├── feed.py          # Display Posts
│   │   ├── interaction.py        # Manage Interactions
│   │   ├── login.py  # Manage Login & Logout & Registration
│   │   └── profile.py  # Connection Pool
│   ├── uploads/             # Local storage fallback
│   └── app.py               # Manage Routes Connection
├── front/
│   ├── src/
│   │   ├── components/      # Reusable UI
│   │   │   ├── ShotCard.jsx    # The core card
│   │   │   ├── FloatingMenu.jsx # Navigation
│   │   │   ├── AuthScreen.jsx   # Login/Register Flip Card
│   │   │   └── Toast.jsx        # Notifications
│   │   ├── pages/           # Application Views
│   │   │   ├── Feed.jsx        # Infinite Scroll Home
│   │   │   ├── Upload.jsx      # Post Creation
│   │   │   └── Profile.jsx     # User History & Management
│   │   ├── App.jsx          # Router & Auth State
│   │   └── index.css
│   └── ...
├── .env                     # Environment variables
└── requirements.txt         # Python dependencies
```

## ⚡ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YammahTea/oneshot
cd oneshot
```

### Option A: 🐳 Docker Quick Start (Recommended)

Skip the manual installation and run the entire stack (Frontend, Backend, Database, Redis) with one command.

#### Prerequisites
* **Docker Desktop** installed and running.

#### 1. Configuration
Create a .env file in the root directory. You can use the values below (Postgres/Redis are handled automatically):
```text
# Authentication
AUTH_SECRET_KEY="random_secret_string"
AUTH_ALGORITHM="HS256"
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# R2 Storage (Optional - Leave empty for local storage)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""
```


#### 2. Run the App
* **For Production Experience (Pre-built Images):**
```bash
docker compose -f docker-compose.prod.yml up
```

* **For Development (Local Build):**
```bash
docker compose up --build
```

#### 3. Access
| Service | URL |
| :--- | :--- |
| **Frontend** | [http://localhost:5173](http://localhost:5173) |
| **Backend Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) |


### 🛠️ Option B: Manual Installation

#### Prerequisites
* Python **3.14**
* Node.js & npm

#### 1. Backend Setup
Create a virtual environment and install dependencies.

```bash
# Create and activate virtual env
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
# OR if using UV
uv sync
```

#### 2. Backend Configuration (.env)
Create a .env in the root with your secrets. You must also include the Database URL:
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

# Redis url
REDIS_URL=""
```
#### 3. Run the backend server
```bash
uvicorn Back.app:app --reload
```

#### 4. Frontend Setup
#### Open a new terminal and navigate to the front folder.
```bash
cd front
npm install
```

#### 5. Frontend Configuration (.env)
Create a .env file in the `front/` directory:
```text
VITE_API_URL="http://localhost:8000"
```

#### 6. Run Frontend
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
