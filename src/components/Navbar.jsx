function Navbar() {
  return (
    <div className="h-16 bg-slate-800 text-white flex items-center justify-between px-6 border-b border-slate-700">
      <h1 className="text-xl font-semibold">
        Dashboard
      </h1>

      <button
        className="bg-red-600 px-4 py-2 rounded"
        onClick={() => {

          const confirmLogout = window.confirm(
            "Are you sure you want to logout?"
          );

          if (!confirmLogout) return;

          localStorage.removeItem("token");

          window.location.href = "/";
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default Navbar;