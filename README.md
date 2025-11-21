# UUMS

## Table of Contents

- [About The Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)

## About The Project

This project serves as a template or a base for a User Management System (UUMS). It includes a frontend built with React, Vite, and TypeScript, and a backend powered by Node.js and Express. The recent update containerizes the MongoDB database using Docker, simplifying the database setup process.

## Tech Stack

*   **Frontend**: React, Vite, TypeScript, Tailwind CSS
*   **Backend**: Node.js, Express.js
*   **Database**: MongoDB with Mongoose
*   **Containerization**: Docker, Docker Compose

## Getting Started

Follow these steps to get your development environment set up and running.

### Prerequisites

Make sure you have the following software installed on your machine:
*   **Node.js**: [Download & Install Node.js](https://nodejs.org/)
*   **pnpm**: After installing Node.js, install pnpm globally.
    ```sh
    npm install -g pnpm
    ```
*   **Docker & Docker Compose**: [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Installation & Setup

1.  **Clone the repository**
    ```sh
    git clone https://github.com/Philodoescode/UUMS.git
    cd your-repository
    ```

2.  **Start the Dockerized MongoDB Database**

    In the project's root directory (where `docker-compose.yml` is located), run the following command:
    ```sh
    docker-compose up -d
    ```
    This command will:
    *   Pull the official MongoDB image if you don't have it.
    *   Create and start a MongoDB container named `UUMS_mongo_db` in detached mode (`-d`).
    *   Expose the database on port `27017` of your local machine.
    *   Create a persistent volume `mongo-data` to store your database data.
    *   You can verify the container is running with `docker ps`.

3.  **Configure and Run the Backend**

    *   Navigate to the backend directory:
        ```sh
        cd backend
        ```
    *   Create a `.env` file. You can copy the example below:
        ```sh
        cp .env.example .env # If you create an .env.example
        ```
        Add the following environment variables to your `backend/.env` file:
        ```dotenv
        # backend/.env

        # MongoDB connection string for the Docker container
        MONGO_URI=mongodb://root:example@localhost:27017/UUMS_db?authSource=admin

        # Port for the Express server
        PORT=3000
        ```
        (See [Environment Variables](#environment-variables) for more details on the `MONGO_URI`.)

    *   Install dependencies:
        ```sh
        pnpm install
        ```
    *   Start the development server:
        ```sh
        pnpm dev
        ```
    Your backend server should now be running on `http://localhost:3000` and connected to the MongoDB container. You should see the message "MongoDB Connected via Docker..." in your terminal.

4.  **Configure and Run the Frontend**

    *   Open a new terminal and navigate to the frontend directory:
        ```sh
        cd frontend
        ```
    *   Install dependencies:
        ```sh
        pnpm install
        ```
    *   Start the development server:
        ```sh
        pnpm dev
        ```
    The Vite development server will start, and you can access the frontend by navigating to the provided URL (usually `http://localhost:5173`).

## Project Structure
```
.
├── backend/            # Node.js & Express Backend
│   ├── config/
│   │   └── db.js       # Database connection logic
│   ├── node_modules/
│   ├── .env            # Environment variables (you create this)
│   ├── package.json
│   └── server.js       # Main server entry point
│
├── frontend/           # React & Vite Frontend
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml  # Defines the MongoDB service
└── README.md           # This file
```
## Environment Variables

The backend requires a `.env` file with the following variables:

*   `PORT`: The port on which the Express server will run. Defaults to `3000`.
*   `MONGO_URI`: The connection string for your MongoDB instance. For the provided Docker setup, it breaks down as follows:
    *   `mongodb://`: The standard connection protocol.
    *   `root:example`: The root user and password defined in `docker-compose.yml`.
    *   `@localhost:27017`: The host and port where the database is exposed.
    *   `/UUMS_db`: The name of the database to connect to. Mongoose will create it if it doesn't exist.
    *   `?authSource=admin`: Specifies the authentication database where the root user was created. This is crucial for successful authentication.