import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import API from "../../api/axios";
import { toast } from "react-toastify";
import Modal from "../../components/Modal";

const StaffPosts = () => {
  const [staffPosts, setStaffPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [formData, setFormData] = useState({
    post_name: "",
    post_code: "",
    staff_category: "Teaching",
    appointment_nature: "Permanent",
    sanctioned_count: 0,
  });
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterFilterCategory] = useState("");

  useEffect(() => {
    fetchStaffPosts();
  }, [search, filterCategory]);

  const fetchStaffPosts = async () => {
    setLoading(true);
    try {
      const response = await API.get("/api/staff-posts", {
        params: {
          search,
          staff_category: filterCategory,
        },
      });
      setStaffPosts(response.data.data);
    } catch (err) {
      setError(err.message);
      toast.error("Failed to fetch staff posts");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateEdit = async (e) => {
    e.preventDefault();
    try {
      if (currentPost) {
        await API.put(`/api/staff-posts/${currentPost.id}`, formData);
        toast.success("Staff post updated successfully");
      } else {
        await API.post("/api/staff-posts", formData);
        toast.success("Staff post created successfully");
      }
      fetchStaffPosts();
      setIsModalOpen(false);
      setCurrentPost(null);
      setFormData({
        post_name: "",
        post_code: "",
        staff_category: "Teaching",
        appointment_nature: "Permanent",
        sanctioned_count: 0,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save staff post");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this staff post?")) {
      try {
        await API.delete(`/api/staff-posts/${id}`);
        toast.success("Staff post deleted successfully");
        fetchStaffPosts();
      } catch (err) {
        toast.error("Failed to delete staff post");
      }
    }
  };

  const openCreateModal = () => {
    setCurrentPost(null);
    setFormData({
      post_name: "",
      post_code: "",
      staff_category: "Teaching",
      appointment_nature: "Permanent",
      sanctioned_count: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (post) => {
    setCurrentPost(post);
    setFormData({
      post_name: post.post_name,
      post_code: post.post_code || "",
      staff_category: post.staff_category,
      appointment_nature: post.appointment_nature || "Permanent",
      sanctioned_count: post.sanctioned_count,
    });
    setIsModalOpen(true);
  };

  if (loading) return <div className="text-center text-white">Loading...</div>;
  if (error) return <div className="text-center text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-6 bg-slate-900 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-cyan-400 mb-6">Staff Posts Management</h2>

      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <input
          type="text"
          placeholder="Search by post name or code..."
          className="p-3 border border-slate-700 rounded-md bg-slate-800 text-white w-full md:w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="p-3 border border-slate-700 rounded-md bg-slate-800 text-white w-full md:w-1/3"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Teaching">Teaching</option>
          <option value="Administrative">Administrative</option>
          <option value="Office">Office</option>
          <option value="Support">Support</option>
          <option value="Contractual">Contractual</option>
        </select>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
        >
          <Icon icon="mdi:plus-circle" className="h-5 w-5 inline-block mr-1" />
          Add Staff Post
        </button>
      </div>

      <div className="overflow-x-auto bg-slate-800 rounded-lg shadow-md">
        <table className="min-w-full leading-normal">
          <thead>
            <tr className="bg-slate-700 text-slate-200 uppercase text-sm">
              <th className="px-5 py-3 border-b-2 border-slate-600 text-left">Post Name</th>
              <th className="px-5 py-3 border-b-2 border-slate-600 text-left">Post Code</th>
              <th className="px-5 py-3 border-b-2 border-slate-600 text-left">Staff Category</th>
              <th className="px-5 py-3 border-b-2 border-slate-600 text-left">Appointment Nature</th>
              <th className="px-5 py-3 border-b-2 border-slate-600 text-left">Sanctioned Count</th>
              <th className="px-5 py-3 border-b-2 border-slate-600 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staffPosts.length > 0 ? (
              staffPosts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-700 transition-colors duration-200">
                  <td className="px-5 py-5 border-b border-slate-700 text-sm text-white">{post.post_name}</td>
                  <td className="px-5 py-5 border-b border-slate-700 text-sm text-white">{post.post_code}</td>
                  <td className="px-5 py-5 border-b border-slate-700 text-sm text-white">{post.staff_category}</td>
                  <td className="px-5 py-5 border-b border-slate-700 text-sm text-white">{post.appointment_nature}</td>
                  <td className="px-5 py-5 border-b border-slate-700 text-sm text-white">{post.sanctioned_count}</td>
                  <td className="px-5 py-5 border-b border-slate-700 text-sm">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(post)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Edit"
                      >
                        <Icon icon="mdi:pencil" className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <Icon icon="mdi:delete" className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center px-5 py-5 text-sm text-white">
                  No staff posts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentPost ? "Edit Staff Post" : "Add Staff Post"}>
        <form onSubmit={handleCreateEdit} className="space-y-4">
          <div>
            <label htmlFor="post_name" className="block text-sm font-medium text-slate-300">Post Name</label>
            <input
              type="text"
              id="post_name"
              name="post_name"
              value={formData.post_name}
              onChange={handleInputChange}
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="post_code" className="block text-sm font-medium text-slate-300">Post Code</label>
            <input
              type="text"
              id="post_code"
              name="post_code"
              value={formData.post_code}
              onChange={handleInputChange}
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
              required
            />
          </div>
          <div>
            <label htmlFor="staff_category" className="block text-sm font-medium text-slate-300">Staff Category</label>
            <select
              id="staff_category"
              name="staff_category"
              value={formData.staff_category}
              onChange={handleInputChange}
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
              required
            >
              <option value="Teaching">Teaching</option>
              <option value="Administrative">Administrative</option>
              <option value="Office">Office</option>
              <option value="Support">Support</option>
              <option value="Contractual">Contractual</option>
            </select>
          </div>
          <div>
            <label htmlFor="appointment_nature" className="block text-sm font-medium text-slate-300">Appointment Nature</label>
            <select
              id="appointment_nature"
              name="appointment_nature"
              value={formData.appointment_nature}
              onChange={handleInputChange}
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
              required
            >
              <option value="Permanent">Permanent</option>
              <option value="Temporary">Temporary</option>
              <option value="Contractual">Contractual</option>
              <option value="Part-time">Part-time</option>
              <option value="Outsourced">Outsourced</option>
              <option value="Deputation">Deputation</option>
            </select>
          </div>
          <div>
            <label htmlFor="sanctioned_count" className="block text-sm font-medium text-slate-300">Sanctioned Count</label>
            <input
              type="number"
              id="sanctioned_count"
              name="sanctioned_count"
              value={formData.sanctioned_count}
              onChange={handleInputChange}
              className="mt-1 block w-full p-3 border border-slate-700 rounded-md bg-slate-800 text-white"
              required
              min="0"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
            >
              {currentPost ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffPosts;
