import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import { usePermissions } from "../../hooks/usePermissions";

function Login() {
  const navigate = useNavigate();
  const { reloadPermissions } = usePermissions();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async () => {
    try {
      const res = await API.post("/login", formData);
      console.log(res.data);

      localStorage.setItem("token", res.data.data.token);
      await reloadPermissions();

      alert("Login Successful");

      navigate("/dashboard");
    } catch (error) {
      console.log(error);
      const message = error?.response?.data?.message || "Invalid Credentials";
      alert(message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-96 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">School ERP</h1>
        <p className="mb-6 text-center text-sm text-orange-400/80">Government School Management</p>

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          className="mb-6 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
        />

        <button
          onClick={handleLogin}
          className="w-full rounded-xl bg-orange-500 p-3 font-semibold text-white transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        >
          Login
        </button>
      </div>
    </div>
  );
}

export default Login;
