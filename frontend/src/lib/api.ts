import axios from 'axios';

// Create axios instance with base URL and credentials enabled
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true, // This is crucial for sending/receiving cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;