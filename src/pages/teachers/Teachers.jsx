import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

function Teachers() {

  const [teachers, setTeachers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    teacher_name: "",
    designation: "",
    phone: "",
    age: "",
    gender: "",
  });
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fetchTeachers = async () => {
    try {

      const res = await API.get(`/api/teachers?page=${page}&limit=10&search=${search}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log(res.data);

      setTeachers(res.data.data.teachers);
      setTotalPages(res.data.data.totalPages);
    } catch (error) {
      console.log(error);
    }
  };

  const createTeacher = async () => {
    if (!formData.teacher_name.trim()) {
      return alert("Teacher name is required");
    }

    if (!formData.designation.trim()) {
      return alert("Designation is required");
    }

    if (!formData.phone.trim()) {
      return alert("Mobile number is required");
    }

    if (formData.phone.length !== 10) {
      return alert("Mobile number must be 10 digits");
    }

    if (!formData.age) {
      return alert("Age is required");
    }

    if (!formData.gender.trim()) {
      return alert("Gender is required");
    }
    try {

      if (editingId) {

        await API.put(
          `/api/teachers/${editingId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        alert("Teacher Updated");

        setEditingId(null);

      } else {

        await API.post(
          "/api/teachers",
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        alert("Teacher Added");
      }

      fetchTeachers();

      setFormData({
        teacher_name: "",
        designation: "",
        phone: "",
        age: "",
        gender: "",
      });

    } catch (error) {

      console.log(error);

    }
  };

  const editTeacher = (teacher) => {

    setFormData({
      teacher_name: teacher.teacher_name,
      designation: teacher.designation,
      phone: teacher.phone,
      age: teacher.age,
      gender: teacher.gender,
    });

    setEditingId(teacher.id);
  };

  const deleteTeacher = async (id) => {

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this teacher?"
    );

    if (!confirmDelete) return;

    try {

      await API.delete(`/api/teachers/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      alert("Teacher Deleted");

      fetchTeachers();

    } catch (error) {

      console.log(error);

    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [search, page]);

  
  return (
    <DashboardLayout>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl text-white font-bold">
          Teachers
        </h1>

        <button className="bg-blue-600 px-4 py-2 rounded text-white">
          Add Teacher
        </button>
      </div>
      <input
        type="text"
        placeholder="Search Teachers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 rounded bg-slate-800 text-white mb-6"
      />
      
      <div className="bg-slate-800 p-4 rounded-xl mb-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            type="text"
            name="teacher_name"
            placeholder="Teacher Name"
            value={formData.teacher_name}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          />

          <input
            type="text"
            name="designation"
            placeholder="Post / Designation"
            value={formData.designation}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          />

          <input
            type="text"
            name="phone"
            placeholder="Mobile Number"
            value={formData.phone}
            onChange={(e) => {
              const value = e.target.value;

              if (/^\d{0,10}$/.test(value)) {
                setFormData({
                  ...formData,
                  phone: value,
                });
              }
            }}
            className="p-3 rounded bg-slate-700 text-white"
          />

          <input
            type="number"
            name="age"
            placeholder="Age"
            value={formData.age}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          />

          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button
          onClick={createTeacher}
          className="bg-green-600 px-4 py-2 rounded mt-4 text-white"
        >
          {editingId ? "Update Teacher" : "Save Teacher"}
        </button>

      </div>
      <div className="bg-slate-800 rounded-xl p-4 overflow-x-auto">

        <table className="w-full text-white">

          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Subject</th>
              <th className="text-left p-3">Mobile</th>
              <th className="text-left p-3">Gender</th>
              <th className="text-left p-3">Age</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>

          <tbody>

            {teachers.length > 0 ? (

              teachers.map((teacher, index) => (

                <tr
                  key={teacher.id}
                  className={`
                    border-b border-slate-700
                    hover:bg-slate-700/40
                    ${index % 2 === 0 ? "bg-slate-800/30" : ""}
                  `}
                >

                  <td className="p-3 w-56">
                    {teacher.teacher_name}
                  </td>

                  <td className="p-3 w-44">
                    {teacher.designation}
                  </td>

                  <td className="p-3 w-44">
                    {teacher.phone}
                  </td>

                  <td className="p-3 w-32">
                    {teacher.gender || "-"}
                  </td>

                  <td className="p-3 w-24">
                    {teacher.age || "-"}
                  </td>

                  <td className="p-3">

                    <button
                      onClick={() => deleteTeacher(teacher.id)}
                      className="bg-red-600 px-3 py-1 rounded text-white"
                    >
                      Delete
                    </button>

                    <button
                      onClick={() => editTeacher(teacher)}
                      className="bg-yellow-500 px-3 py-1 rounded text-white ml-2"
                    >
                      Edit
                    </button>

                  </td>

                </tr>

              ))

            ) : (

              <tr>

                <td
                  colSpan="6"
                  className="text-center p-6 text-slate-400"
                >
                  No teachers found
                </td>

              </tr>

            )}

          </tbody>
          
        </table>
        <div className="flex justify-center items-center gap-4 mt-6">

              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="bg-slate-700 px-4 py-2 rounded text-white disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-white">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="bg-slate-700 px-4 py-2 rounded text-white disabled:opacity-50"
              >
                Next
              </button>

            </div>
        </div>

    </DashboardLayout>
  );
}

export default Teachers;