---

# ☁️ Cloud Task Manager

A modern, serverless task management application built with **Vanilla JavaScript**, hosted on **Cloudflare Pages**, powered by **Cloudflare Functions** and **IBM Cloudant**. This project delivers a full-featured, multi-user to-do list experience with a sleek, responsive interface.

---

## 🔗 Live Demo

🌐 [Try it here](https://task-manager-ag0.pages.dev/)

---

## 📸 Screenshots

![Cloud Task Manager Screenshot](https://ibb.co/PZhRzHx3
https://ibb.co/HDmc94tQ))
*Replace the link above with a valid screenshot URL*

---

## ✨ Features

* ✅ **Full CRUD Operations** — Create, read, update, and delete your tasks effortlessly
* 🔐 **Secure Authentication** — User registration and login with isolated task storage
* 👥 **Multi-user Support** — Each user’s tasks are stored in their own database
* 🔎 **Dynamic Filters & Search** — Filter by status and search by title/description
* 📱 **Responsive Design** — Works beautifully on mobile, tablet, and desktop
* 🌙 **Dark/Light Mode** — Smart theme toggle saved in cookies
* ⚡ **Serverless Backend** — All logic runs on Cloudflare Functions
* 🧱 **NoSQL Powered** — Data stored in IBM Cloudant, a JSON-based database

---

## 🧰 Tech Stack

* 🎨 **Frontend**: HTML5, CSS3, JavaScript (ES6+)
* 🚀 **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)
* 🧠 **Backend**: [Cloudflare Functions](https://developers.cloudflare.com/pages/functions/)
* 🗃️ **Database**: [IBM Cloudant](https://www.ibm.com/cloud/cloudant)

## 🛠 Tech Stack

| Layer       | Tools Used                        |
|-------------|-----------------------------------|
| **Frontend**| HTML, CSS, JavaScript             |
| **Backend** | JavaScript                        |
| **Database**| IBM Cloudant NoSQL DB             |
| **Hosting** | Cloudflare Pages                  |

---

## 🗂️ Project Structure

```
/
├── functions/
│   ├── login.js       # Handles user login and session cookie creation
│   ├── register.js    # Handles new user registration and database creation
│   └── tasks.js       # Handles all CRUD operations for tasks
│
├── index.html         # Main application page (task list)
├── login.html         # User login page
├── register.html      # User registration page
├── script.js          # Frontend JavaScript for the main application
└── style.css          # All application styles
```

🧩 The `functions/` directory contains all backend logic exposed as API endpoints.
---

## 🚀 Deployment Guide

### 🛠️ Prerequisites

* A free [Cloudflare](https://dash.cloudflare.com/sign-up) account
* A free [IBM Cloud](https://cloud.ibm.com/registration) account
* Git installed locally and a [GitHub](https://github.com/) account

---

### ☁️ IBM Cloudant Setup

1. Log into your IBM Cloud account
2. Create a **Cloudant** service instance (choose Lite plan)
3. Navigate to **Service Credentials**, create a new credential
4. Save your `url`, `apikey`, and `password`
5. Launch the Cloudant dashboard
6. Create a **`users`** database (no partitioning)

---

### 🔄 Clone & Deploy

```bash
git clone https://github.com/priyanshu3301/task-manager.git
cd task-manager
```

---

### 🌐 Deploy to Cloudflare Pages

1. Log in to Cloudflare → Pages → Create Application
2. Connect to your GitHub repo
3. Set:

   * **Framework preset**: `None`
   * **Build command**: *(leave blank)*
   * **Output directory**: `/` or blank
4. Click **Save and Deploy**

---

### 🔐 Configure Environment Variables

In your Cloudflare Pages dashboard → **Settings > Environment Variables**, add:

| Name           | Value                                | Notes                                                      |
| -------------- | ------------------------------------ | ---------------------------------------------------------- |
| `DATABASE_URL` | `https://<your-cloudant-url>/`       | Base URL from your service credentials (must end with `/`) |
| `AUTH_URL`     | `https://<your-cloudant-url>/users/` | Points to your `users` database (must end with `/`)        |
| `DB_USERNAME`  | `apikey-v2-xxxxxxxxxxxxxxxx`         | The `apikey` from Cloudant service credentials             |
| `DB_PASSWORD`  | `xxxxxxxxxxxxxxxx`                   | The `password` from the credentials (not the IAM API key!) |

🔁 Once done, go to **Deployments** and click **Redeploy** to apply.

---

## 🎉 Done!

Visit your deployed URL, register a user, and start managing your tasks in the cloud ☁️📝

If you need help generating a proper screenshot or linking one, just ask.
