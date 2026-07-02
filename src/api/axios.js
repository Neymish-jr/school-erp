import axios from "axios";
import { getActiveSchoolId } from "../utils/schoolContext";

const API = axios.create({
  baseURL: "http://localhost:3000",
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeSchoolId = getActiveSchoolId();
    if (activeSchoolId != null) {
      config.headers["X-School-Id"] = String(activeSchoolId);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default API;