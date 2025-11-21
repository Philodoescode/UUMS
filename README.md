# Application Setup Guide

This project consists of two main parts: a **backend** API built with Node.js/Express and SQLite, and a **frontend** built with React, Vite, and TypeScript, styled using Tailwind CSS (with shadcn/ui conventions).

## Prerequisites

Before running the application, ensure you have the following installed on your system:

1.  **Node.js:** (Version 18 or later is recommended).
2.  **pnpm:** This project uses `pnpm` as the package manager. You must install it globally if you haven't already.

```bash
npm install -g pnpm
```

## Installation

Follow these steps to install the dependencies for both the backend and frontend services.

### 1. Install Backend Dependencies

Navigate to the `backend` directory and install the necessary Node.js packages.

```bash
cd backend
pnpm install
```

### 2. Install Frontend Dependencies

Navigate to the `frontend` directory and install the required React and development packages.

```bash
cd ../frontend
pnpm install
```

## Database Setup

The backend uses **SQLite**. No manual migration steps are required initially.

*   The database connection is configured in `backend/db.js`.
*   The SQLite database file (`database.sqlite`) will be automatically created in the `backend/` directory the first time the server runs.

## Running the Application

Both the backend and frontend must be running concurrently. You will need two separate terminal windows for this.

### 1. Start the Backend Server

The backend runs on **Port 5000** and uses `nodemon` for automatic restarts during development.

In your first terminal:

```bash
cd backend
pnpm dev
```

You should see the output: `Server running on port 5000`.

### 2. Start the Frontend Application

The frontend uses Vite and will typically start on port 5173 (or the next available port).

In your second terminal:

```bash
cd frontend
pnpm dev
```

The terminal will provide the local URL, typically:

```
> Local: http://127.0.0.1:5173/
```

Open this URL in your browser to view the application.

---