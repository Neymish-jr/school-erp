import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-64 h-screen bg-slate-800 text-white p-5">
      <h1 className="text-2xl font-bold mb-10">
        School ERP
      </h1>

      <div className="flex flex-col gap-4">

        <Link to="/dashboard" className="hover:text-blue-400">
          Dashboard
        </Link>

        <Link to="/students" className="hover:text-blue-400">
          Students
        </Link>

        <Link to="/classes" className="hover:text-blue-400">
          Classes
        </Link>

        <Link to="/teachers" className="hover:text-blue-400">
          Teachers
        </Link>

        <Link to="/attendance" className="hover:text-blue-400">
          Attendance
        </Link>

      </div>
    </div>
  );
}

export default Sidebar;