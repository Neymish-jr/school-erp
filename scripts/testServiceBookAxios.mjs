import axios from "axios";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", "backend", ".env") });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const API = axios.create({ baseURL: "http://localhost:3000" });

const userResult = await pool.query(
  "SELECT id, role, school_id FROM users WHERE role = 'admin' LIMIT 1"
);
const user = userResult.rows[0];
const token = jwt.sign(
  { id: user.id, role: user.role, school_id: user.school_id },
  process.env.JWT_SECRET
);

localStorageMock(token);

function localStorageMock(token) {
  API.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
}

const teacherId = 3;
const [serviceBookResponse] = await Promise.all([
  API.get(`/api/staff-service-history/teacher/${teacherId}/service-book`),
]);

console.log("[AXIOS SIM] status:", serviceBookResponse.status);
console.log("[AXIOS SIM] data:", serviceBookResponse.data);
console.log("[AXIOS SIM] data.data:", serviceBookResponse.data?.data);
console.log(
  "[AXIOS SIM] timeline length:",
  serviceBookResponse.data?.data?.timeline?.length ?? "missing"
);

const serviceBook = serviceBookResponse?.data?.data || null;
const timeline = serviceBook?.timeline || [];
console.log("[AXIOS SIM] react serviceBook null?", serviceBook === null);
console.log("[AXIOS SIM] react timeline length:", timeline.length);

await pool.end();
