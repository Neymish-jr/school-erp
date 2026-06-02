import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../api/axios";

const staffCategories = [
  "Teaching",
  "Administrative",
  "Office",
  "Support",
  "Contractual",
];

const appointmentNatures = [
  "Permanent",
  "Temporary",
  "Contractual",
  "Part-time",
  "Outsourced",
  "Deputation",
];

const emptyForm = {
  post_name: "",
  staff_category: "Teaching",
  appointment_nature: "Permanent",
  is_teaching_post: true,
  sanctioned_count: 1,
};

function StaffPosts() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  const fetchPosts = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError("");

    try {
      const response = await API.get("/api/staff-posts", {
        headers: getAuthHeaders(),
        params: {
          search: search.trim(),
          staff_category: categoryFilter || undefined,
        },
      });

      const data = response?.data?.data || [];
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setPosts([]);
      setError(err?.response?.data?.message || "Unable to load staff posts right now.");
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const activeCount = useMemo(
    () => posts.filter((post) => post.is_active).length,
    [posts]
  );

  const teachingCount = useMemo(
    () => posts.filter((post) => post.is_teaching_post).length,
    [posts]
  );

  const totalSanctioned = useMemo(
    () =>
      posts.reduce((total, post) => total + Number(post.sanctioned_count || 0), 0),
    [posts]
  );

  const openAddModal = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (post) => {
    setEditingId(post.id);
    setFormData({
      post_name: post.post_name || "",
      staff_category: post.staff_category || "Teaching",
      appointment_nature: post.appointment_nature || "Permanent",
      is_teaching_post: Boolean(post.is_teaching_post),
      sanctioned_count: Number(post.sanctioned_count || 0),
    });
    setError("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCategoryChange = (event) => {
    const nextCategory = event.target.value;

    setFormData((prev) => ({
      ...prev,
      staff_category: nextCategory,
      is_teaching_post: nextCategory === "Teaching" ? true : prev.is_teaching_post,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      post_name: formData.post_name.trim(),
      staff_category: formData.staff_category,
      appointment_nature: formData.appointment_nature,
      is_teaching_post: Boolean(formData.is_teaching_post),
      sanctioned_count: Number(formData.sanctioned_count),
    };

    if (!payload.post_name) {
      setError("Post name is required.");
      return;
    }

    if (!Number.isInteger(payload.sanctioned_count) || payload.sanctioned_count < 0) {
      setError("Sanctioned count must be a whole number of zero or more.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      if (editingId) {
        await API.put(`/api/staff-posts/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Staff post updated successfully.");
      } else {
        await API.post("/api/staff-posts", payload, {
          headers: getAuthHeaders(),
        });
        setSuccessMessage("Staff post added successfully.");
      }

      closeModal();
      await fetchPosts();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to save staff post."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) {
      return;
    }

    setIsDeactivating(true);
    setError("");
    setSuccessMessage("");

    try {
      await API.delete(`/api/staff-posts/${deactivateTarget}`, {
        headers: getAuthHeaders(),
      });

      setDeactivateTarget(null);
      setSuccessMessage("Staff post deactivated successfully.");
      await fetchPosts();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to deactivate staff post.");
    } finally {
      setIsDeactivating(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
  };

  const applyFilters = () => {
    fetchPosts(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
              Administration Setup
            </p>
            <h1 className="mt-3 text-4xl font-bold text-white">Staff Posts</h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Maintain sanctioned and operational posts for teaching, administrative, office, support, and contractual staff.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + Add Post
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Active Posts</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : activeCount}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Teaching Posts</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : teachingCount}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
            <p className="text-sm text-slate-300">Sanctioned Strength</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {isLoading ? "..." : totalSanctioned}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_240px_auto_auto] lg:items-end">
            <label className="text-sm font-medium text-slate-200">
              Search posts
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by post name or code"
                className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="text-sm font-medium text-slate-200">
              Category
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              >
                <option value="">All categories</option>
                {staffCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={applyFilters}
              disabled={isRefreshing}
              className="rounded-2xl border border-cyan-400 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshing ? "Refreshing..." : "Apply"}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
            >
              Reset
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-100">
              <thead className="bg-slate-950/80 text-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Post Code</th>
                  <th className="px-4 py-3 font-semibold">Post Name</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Appointment</th>
                  <th className="px-4 py-3 font-semibold">Teaching</th>
                  <th className="px-4 py-3 font-semibold">Sanctioned</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-slate-800">
                      {Array.from({ length: 8 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-4">
                          <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : posts.length === 0 ? (
                  <tr className="border-t border-slate-800">
                    <td colSpan="8" className="px-4 py-10 text-center text-slate-300">
                      No staff posts found.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr
                      key={post.id}
                      className="border-t border-slate-800 transition hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4 font-medium text-white">
                        {post.post_code || "-"}
                      </td>
                      <td className="px-4 py-4">{post.post_name || "-"}</td>
                      <td className="px-4 py-4">{post.staff_category || "-"}</td>
                      <td className="px-4 py-4">{post.appointment_nature || "-"}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            post.is_teaching_post
                              ? "bg-cyan-500/15 text-cyan-100"
                              : "bg-slate-700 text-slate-200"
                          }`}
                        >
                          {post.is_teaching_post ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-4">{post.sanctioned_count}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            post.is_active
                              ? "bg-emerald-500/15 text-emerald-100"
                              : "bg-rose-500/15 text-rose-100"
                          }`}
                        >
                          {post.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(post)}
                            className="rounded-xl bg-amber-400 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeactivateTarget(post.id)}
                            disabled={!post.is_active}
                            className="rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                  {editingId ? "Edit Staff Post" : "Add Staff Post"}
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  {editingId ? "Update post details" : "Create a staff post"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-200 md:col-span-2">
                Post Name
                <input
                  type="text"
                  name="post_name"
                  value={formData.post_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Principal, Clerk, Lab Assistant"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="text-sm text-slate-200">
                Category
                <select
                  name="staff_category"
                  value={formData.staff_category}
                  onChange={handleCategoryChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  {staffCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-200">
                Appointment Nature
                <select
                  name="appointment_nature"
                  value={formData.appointment_nature}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                >
                  {appointmentNatures.map((nature) => (
                    <option key={nature} value={nature}>
                      {nature}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-200">
                Sanctioned Count
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="sanctioned_count"
                  value={formData.sanctioned_count}
                  onChange={handleInputChange}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <span>Teaching Post</span>
                  <input
                    type="checkbox"
                    name="is_teaching_post"
                    checked={formData.is_teaching_post}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500"
                  />
                </div>
              </label>

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Post" : "Add Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deactivateTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300">
              Confirm deactivate
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Deactivate this post?
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              The post will remain in history but will no longer be treated as active.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={isDeactivating}
                className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeactivating ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

export default StaffPosts;
