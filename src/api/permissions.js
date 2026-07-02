import API from "./axios";

export const fetchMyPermissions = () => API.get("/permissions");
