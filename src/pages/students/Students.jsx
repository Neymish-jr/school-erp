import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

function Students() {

  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    category: "",
    student_class: "",
    section: "",
  });
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fetchStudents = async () => {
    try {

      const res = await API.get(`/api/students?page=${page}&limit=10&search=${search}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log(res.data);

      setStudents(res.data.data.students);
      setTotalPages(res.data.data.totalPages);
    } catch (error) {
      console.log(error);
    }
  };

  const createStudent = async () => {

    try {

      if (editingId) {

        await API.put(
          `/api/students/${editingId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        alert("Student Updated");

        setEditingId(null);

      } else {

        await API.post(
          "/api/students",
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        alert("Student Added");
      }

      fetchStudents();

      setFormData({
        name: "",
        gender: "",
        category: "",
        student_class: "",
        section: "",
      });

    } catch (error) {

      console.log(error);

    }
  };

  const editStudent = (student) => {

    setFormData({
      name: student.name,
      gender: student.gender,
      category: student.category,
      student_class: student.student_class,
      section: student.section,
    });

    setEditingId(student.id);
  };

  const deleteStudent = async (id) => {

    try {

      await API.delete(
        `/api/students/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      fetchStudents();

      alert("Student Deleted");

    } catch (error) {

      console.log(error);

    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, page]);

  
  return (
    <DashboardLayout>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl text-white font-bold">
          Students
        </h1>

        <button className="bg-blue-600 px-4 py-2 rounded text-white">
          Add Student
        </button>
      </div>
      <input
        type="text"
        placeholder="Search Students..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 rounded bg-slate-800 text-white mb-6"
      />
      
      <div className="bg-slate-800 p-4 rounded-xl mb-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <input
            type="text"
            name="name"
            placeholder="Student Name"
            value={formData.name}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          />

          <input
            type="text"
            name="gender"
            placeholder="Gender"
            value={formData.gender}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          />

          <input
            type="text"
            name="category"
            placeholder="Category"
            value={formData.category}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          />

          <input
            type="text"
            name="student_class"
            placeholder="Class"
            value={formData.student_class}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          />

          <input
            type="text"
            name="section"
            placeholder="Section"
            value={formData.section}
            onChange={handleChange}
            className="p-3 rounded bg-slate-700 text-white"
          />

        </div>

        <button
          onClick={createStudent}
          className="bg-green-600 px-4 py-2 rounded mt-4 text-white"
        >
          {editingId ? "Update Student" : "Save Student"}
        </button>

      </div>
      <div className="bg-slate-800 rounded-xl p-4 overflow-x-auto">

        <table className="w-full text-white">

          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Class</th>
              <th className="text-left p-3">Section</th>
              <th className="text-left p-3">Gender</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>

          <tbody>

            {students.map((student) => (
              <tr
                key={student.id}
                className="border-b border-slate-700"
              >
                <td className="p-3">{student.name}</td>
                <td className="p-3">{student.student_class}</td>
                <td className="p-3">{student.section}</td>
                <td className="p-3">{student.gender}</td>

                <td className="p-3">

                  <button
                    onClick={() => deleteStudent(student.id)}
                    className="bg-red-600 px-3 py-1 rounded text-white"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => editStudent(student)}
                    className="bg-yellow-500 px-3 py-1 rounded text-white ml-2"
                  >
                    Edit
                  </button>
                </td>

              </tr>
            ))}

          </tbody>
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
        </table>

      </div>

    </DashboardLayout>
  );
}

export default Students;