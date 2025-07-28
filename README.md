# Cloud Task Manager

A modern, serverless task management application built with Vanilla JavaScript and powered by Cloudflare Pages, Cloudflare Functions, and IBM Cloudant. This project provides a full-featured, multi-user to-do list experience with a clean, responsive interface.

![Cloud Task Manager Screenshot](https://i.imgur.com/your-screenshot-url.png) <!-- Replace with an actual screenshot URL -->

## Features

- **Full CRUD Functionality**: Create, Read, Update, and Delete tasks.
- **User Authentication**: Secure user registration and login system.
- **Multi-User Data Isolation**: Each user's tasks are stored in their own dedicated, secure database.
- **Dynamic Filtering & Searching**: Instantly filter tasks by status (All, Pending, Completed) and search by title or description.
- **Responsive Design**: A seamless experience across desktop, tablet, and mobile devices.
- **Dark/Light Mode**: A stylish theme toggle with user preferences saved to cookies.
- **Serverless Backend**: All backend logic is handled by high-performance Cloudflare Functions.
- **NoSQL Database**: Leverages the scalability and flexibility of IBM Cloudant, a distributed JSON document database.

---

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Hosting**: [Cloudflare Pages](https://pages.cloudflare.com/)
- **Backend**: [Cloudflare Functions](https://developers.cloudflare.com/pages/functions/) (Serverless API)
- **Database**: [IBM Cloudant](https://www.ibm.com/cloud/cloudant) (NoSQL DBaaS)

---

## Project Structure

The project uses a "Functions-first" routing model on Cloudflare Pages, separating static content from the serverless API.

<pre> ```
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
├── style.css          # All application styles
└── _routes.json       # Cloudflare Pages routing configuration
``` </pre>

- **`/functions`**: Contains all backend API logic. Each file corresponds to an API endpoint.
- **`_routes.json`**: This critical file tells Cloudflare which paths are handled by functions and which are static assets, preventing routing conflicts.

---

## Deployment Guide

Follow these steps to set up and deploy your own instance of the Cloud Task Manager.

### Step 1: Prerequisites

1.  **Cloudflare Account**: You will need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.
2.  **IBM Cloud Account**: You will need a free [IBM Cloud](https://cloud.ibm.com/registration) account to provision a Cloudant database instance.
3.  **Git & GitHub**: You should have Git installed and a [GitHub](https://github.com/) account.

### Step 2: Set Up IBM Cloudant Database

1.  Log in to your IBM Cloud account.
2.  Create a **Cloudant** service instance (the "Lite" plan is free and sufficient for this project).
3.  Once the instance is provisioned, go to its dashboard and click **"Service credentials"**.
4.  Create a new credential. Note down the **`url`**, **`apikey`** (this is your `DB_USERNAME`), and **`password`** (this is your `DB_PASSWORD`).
5.  Go back to the Cloudant dashboard and click **"Launch Dashboard"**.
6.  In the Cloudant dashboard, create a new database named **`users`**. This database will store the authentication documents for all users. **Do not partition this database.**

### Step 3: Fork and Clone the Repository

1.  Fork this GitHub repository to your own account.
2.  Clone your forked repository to your local machine:
    ```bash
    git clone [https://github.com/your-username/task-manager.git](https://github.com/your-username/task-manager.git)
    cd task-manager
    ```

### Step 4: Deploy to Cloudflare Pages

1.  Log in to your Cloudflare dashboard.
2.  Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3.  Select your forked repository.
4.  In the **"Build settings"** section, configure the project as follows:
    - **Framework preset**: `None`
    - **Build command**: (leave this blank)
    - **Build output directory**: `/` (or leave blank)
5.  Click **"Save and Deploy"**.

### Step 5: Configure Environment Variables

This is the most important step for connecting your application to the database.

1.  After the first deployment finishes, go to your new Pages project's dashboard.
2.  Navigate to **Settings** > **Environment variables**.
3.  Add the following **four** variables, using the credentials you saved from IBM Cloudant:

| Variable Name   | Value                                                              | Description                                                                 |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `DATABASE_URL`  | `https://<your-instance-url>/`                                     | The base URL from your Cloudant credentials. **Must end with a slash `/`**. |
| `AUTH_URL`      | `https://<your-instance-url>/users/`                               | The URL for your `users` database. **Must end with a slash `/`**.           |
| `DB_USERNAME`   | `apikey-v2-xxxxxxxx`                                               | The `apikey` from your Cloudant credentials.                                |
| `DB_PASSWORD`   | `xxxxxxxxxxxxxxxx`                                                 | The `password` from your Cloudant credentials.                              |

4.  After adding the variables, go back to the **"Deployments"** tab and redeploy the latest version to apply the new settings.

Your application is now live! You can visit the URL provided by Cloudflare Pages, register a new account, and start managing your tasks.
