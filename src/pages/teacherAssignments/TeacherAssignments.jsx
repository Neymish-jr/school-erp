import { useEffect, useMemo, useState } from "react";

import DashboardLayout from "../../layouts/DashboardLayout";

import API from "../../api/axios";
import { usePermissions } from "../../hooks/usePermissions";

import { sortClassesNaturally } from "../../utils/sortClasses";

import { isActiveStaffTeacher } from "../teachers/constants/teacherStatus";



const EMPTY_FORM = {

  teacher_id: "",

  class_section_id: "",

  subject_id: "",

  assignment_start_date: new Date().toISOString().split("T")[0],

};



const EMPTY_RELIEVE_FORM = {

  assignment_end_date: new Date().toISOString().split("T")[0],

};



const formatDate = (value) => {

  if (!value) {

    return "-";

  }



  return new Date(value).toLocaleDateString();

};



function TeacherAssignments() {

  const { can } = usePermissions();
  const canAssign = can("teacher_subject_assignment.assign");
  const canRelieve = can("teacher_subject_assignment.relieve");
  const canReadAll = can("teacher_subject_assignment.read");
  const useOwnAssignmentsEndpoint =
    can("teacher_subject_assignment.read_own") && !canReadAll;

  const [assignments, setAssignments] = useState([]);

  const [teachers, setTeachers] = useState([]);

  const [classSections, setClassSections] = useState([]);

  const [subjects, setSubjects] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");

  const [includeHistory, setIncludeHistory] = useState(false);

  const [relieveTarget, setRelieveTarget] = useState(null);

  const [relieveFormData, setRelieveFormData] = useState(EMPTY_RELIEVE_FORM);

  const [isRelieving, setIsRelieving] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const getAuthHeaders = () => {

    const token = localStorage.getItem("token");



    return token

      ? {

          Authorization: `Bearer ${token}`,

        }

      : {};

  };



  const fetchDropdownData = async () => {

    try {

      const [

        teachersResponse,

        classSectionsResponse,

        subjectsResponse,

      ] = await Promise.all([

        API.get("/api/teachers", {

          headers: getAuthHeaders(),

          params: {

            page: 1,

            limit: 1000,

            search: "",

          },

        }),



        API.get("/api/class-sections", {

          headers: getAuthHeaders(),

        }),



        API.get("/api/subjects", {

          headers: getAuthHeaders(),

        }),

      ]);



      setTeachers(

        (teachersResponse?.data?.data?.teachers || []).filter(isActiveStaffTeacher)

      );



      const sortedClassSections = sortClassesNaturally(

        classSectionsResponse?.data?.data || []

      );



      setClassSections(sortedClassSections);



      setSubjects(

        subjectsResponse?.data?.data || []

      );

    } catch (err) {

      setError(

        err?.response?.data?.message ||

          "Unable to load teacher subject options."

      );

    }

  };



  const fetchAssignments = async () => {

    setIsLoading(true);

    setError("");



    try {

      const endpoint = useOwnAssignmentsEndpoint

        ? "/api/teacher-subject-assignments/me"

        : "/api/teacher-subject-assignments";



      const response = await API.get(endpoint, {

        headers: getAuthHeaders(),

        params: includeHistory ? { include_history: true } : {},

      });



      setAssignments(response?.data?.data || []);

    } catch (err) {

      setAssignments([]);



      setError(

        err?.response?.data?.message ||

          "Unable to load teacher subjects."

      );

    } finally {

      setIsLoading(false);

    }

  };



  useEffect(() => {

    void fetchDropdownData();

  }, []);



  useEffect(() => {

    void fetchAssignments();

  }, [useOwnAssignmentsEndpoint, includeHistory]);



  const activeAssignments = useMemo(

    () => assignments.filter((assignment) => assignment.is_active),

    [assignments]

  );



  const filteredAssignments = useMemo(() => {

    const query = search.trim().toLowerCase();



    if (!query) {

      return assignments;

    }



    return assignments.filter((assignment) => {

      const teacherName =

        (assignment.teacher_name || "").toLowerCase();



      const className =

        (assignment.class_name || "").toLowerCase();



      const sectionName =

        (assignment.section_name || "").toLowerCase();



      const subjectName =

        (assignment.subject_name || "").toLowerCase();



      const subjectCode =

        (assignment.subject_code || "").toLowerCase();



      return (

        teacherName.includes(query) ||

        className.includes(query) ||

        sectionName.includes(query) ||

        subjectName.includes(query) ||

        subjectCode.includes(query)

      );

    });

  }, [assignments, search]);



  const handleInputChange = (e) => {

    const { name, value } = e.target;



    setFormData((prev) => ({

      ...prev,

      [name]: value,

    }));

  };



  const handleRelieveInputChange = (e) => {

    const { name, value } = e.target;



    setRelieveFormData((prev) => ({

      ...prev,

      [name]: value,

    }));

  };



  const handleSubmit = async (e) => {

    e.preventDefault();



    if (

      !formData.teacher_id ||

      !formData.class_section_id ||

      !formData.subject_id ||

      !formData.assignment_start_date

    ) {

      setError(

        "Please select a teacher, class section, subject, and start date."

      );



      return;

    }



    setIsSaving(true);

    setError("");

    setSuccessMessage("");



    try {

      await API.post(

        "/api/teacher-subject-assignments",

        {

          teacher_id: Number(formData.teacher_id),

          class_section_id: Number(

            formData.class_section_id

          ),

          subject_id: Number(formData.subject_id),

          assignment_start_date: formData.assignment_start_date,

        },

        {

          headers: getAuthHeaders(),

        }

      );



      setSuccessMessage(

        "Teacher subject assigned successfully."

      );



      setFormData(EMPTY_FORM);



      await fetchAssignments();

    } catch (err) {

      setError(

        err?.response?.data?.message ||

          "Unable to assign teacher subject."

      );

    } finally {

      setIsSaving(false);

    }

  };



  const openRelieveModal = (assignment) => {

    setRelieveTarget(assignment);

    setRelieveFormData({

      assignment_end_date: new Date().toISOString().split("T")[0],

    });

  };



  const handleRelieve = async () => {

    if (!relieveTarget) {

      return;

    }



    setIsRelieving(true);

    setError("");

    setSuccessMessage("");



    try {

      await API.put(

        `/api/teacher-subject-assignments/${relieveTarget.id}/relieve`,

        relieveFormData,

        {

          headers: getAuthHeaders(),

        }

      );



      setRelieveTarget(null);



      setSuccessMessage(

        "Teacher relieved from subject successfully."

      );



      await fetchAssignments();

    } catch (err) {

      setError(

        err?.response?.data?.message ||

          "Unable to relieve teacher from subject."

      );

    } finally {

      setIsRelieving(false);

    }

  };



  return (

    <DashboardLayout>

      <div className="space-y-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <h1 className="text-sm uppercase tracking-[0.3em] text-orange-600">

              TEACHER SUBJECTS

            </h1>



            <p className="mt-2 max-w-2xl text-slate-300">

              Assign subjects to teachers for each class and section. Relieving an assignment preserves history for service records instead of deleting it.

            </p>

          </div>



          {canAssign ? (

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">

              Admin view: allocate and manage teacher subjects.

            </div>

          ) : null}

        </div>



        {error ? (

          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">

            {error}

          </div>

        ) : null}



        {successMessage ? (

          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">

            {successMessage}

          </div>

        ) : null}



        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">

            <p className="text-sm text-slate-300">

              Active Subject Allocations

            </p>



            <p className="mt-2 text-2xl font-bold text-white">

              {isLoading ? "..." : activeAssignments.length}

            </p>

          </div>



          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">

            <p className="text-sm text-slate-300">

              Visible Subject Allocations

            </p>



            <p className="mt-2 text-2xl font-bold text-white">

              {isLoading

                ? "..."

                : filteredAssignments.length}

            </p>

          </div>



          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">

            <p className="text-sm text-slate-300">

              Historical Records

            </p>



            <p className="mt-2 text-2xl font-bold text-white">

              {isLoading

                ? "..."

                : assignments.filter((assignment) => !assignment.is_active).length}

            </p>

          </div>

        </div>



        {canAssign ? (

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">

            <h2 className="text-lg font-semibold text-white">

              Assign Teacher Subject

            </h2>



            <form

              onSubmit={handleSubmit}

              className="mt-4 grid gap-4 lg:grid-cols-4"

            >

              <label className="text-sm text-slate-200">

                Teacher



                <select

                  name="teacher_id"

                  value={formData.teacher_id}

                  onChange={handleInputChange}

                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"

                >

                  <option value="">

                    Select teacher

                  </option>



                  {teachers.map((teacher) => (

                    <option

                      key={teacher.id}

                      value={teacher.id}

                    >

                      {teacher.teacher_name}

                    </option>

                  ))}

                </select>

              </label>



              <label className="text-sm text-slate-200">

                Class Section



                <select

                  name="class_section_id"

                  value={formData.class_section_id}

                  onChange={handleInputChange}

                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"

                >

                  <option value="">

                    Select class section

                  </option>



                  {classSections.map((entry) => (

                    <option

                      key={entry.id}

                      value={entry.id}

                    >

                      {entry.class_name}{" "}

                      {entry.section_name}

                    </option>

                  ))}

                </select>

              </label>



              <label className="text-sm text-slate-200">

                Subject



                <select

                  name="subject_id"

                  value={formData.subject_id}

                  onChange={handleInputChange}

                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"

                >

                  <option value="">

                    Select subject

                  </option>



                  {subjects.map((subject) => (

                    <option

                      key={subject.id}

                      value={subject.id}

                    >

                      {subject.subject_name} (

                      {subject.subject_code})

                    </option>

                  ))}

                </select>

              </label>



              <label className="text-sm text-slate-200">

                Start Date



                <input

                  type="date"

                  name="assignment_start_date"

                  value={formData.assignment_start_date}

                  onChange={handleInputChange}

                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"

                />

              </label>



              <div className="lg:col-span-4 flex justify-end">

                <button

                  type="submit"

                  disabled={isSaving}

                  className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {isSaving

                    ? "Saving..."

                    : "Assign Teacher Subject"}

                </button>

              </div>

            </form>

          </div>

        ) : null}



        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <input

            type="search"

            value={search}

            onChange={(e) => setSearch(e.target.value)}

            placeholder="Search by teacher, class, section, or subject"

            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400 lg:max-w-md"

          />



          {canReadAll ? (

            <label className="flex items-center gap-2 text-sm text-slate-300">

              <input

                type="checkbox"

                checked={includeHistory}

                onChange={(e) => setIncludeHistory(e.target.checked)}

                className="rounded border-slate-600 bg-slate-950 text-orange-500 focus:ring-orange-400"

              />

              Show historical assignments

            </label>

          ) : null}

        </div>



        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">

          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm text-slate-100">

              <thead className="bg-slate-950/80 text-slate-200">

                <tr>

                  <th className="px-4 py-3 font-semibold">

                    Teacher

                  </th>

                  <th className="px-4 py-3 font-semibold">

                    Class

                  </th>

                  <th className="px-4 py-3 font-semibold">

                    Section

                  </th>

                  <th className="px-4 py-3 font-semibold">

                    Subject

                  </th>

                  <th className="px-4 py-3 font-semibold">

                    Start Date

                  </th>

                  <th className="px-4 py-3 font-semibold">

                    End Date

                  </th>

                  <th className="px-4 py-3 font-semibold">

                    Status

                  </th>

                  <th className="px-4 py-3 font-semibold">

                    Actions

                  </th>

                </tr>

              </thead>



              <tbody>

                {isLoading ? (

                  Array.from({ length: 5 }).map((_, index) => (

                    <tr

                      key={index}

                      className="border-t border-slate-800"

                    >

                      {Array.from({ length: 8 }).map((__, cellIndex) => (

                        <td key={cellIndex} className="px-4 py-4">

                          <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />

                        </td>

                      ))}

                    </tr>

                  ))

                ) : assignments.length === 0 ? (

                  <tr className="border-t border-slate-800">

                    <td

                      colSpan="8"

                      className="px-4 py-10 text-center text-slate-300"

                    >

                      No subject allocations found

                    </td>

                  </tr>

                ) : (

                  filteredAssignments.map((assignment) => (

                    <tr

                      key={assignment.id}

                      className="border-t border-slate-800 transition hover:bg-slate-800/60"

                    >

                      <td className="px-4 py-4 font-medium text-white">

                        {assignment.teacher_name || "-"}

                      </td>

                      <td className="px-4 py-4">

                        {assignment.class_name || "-"}

                      </td>

                      <td className="px-4 py-4">

                        {assignment.section_name || "-"}

                      </td>

                      <td className="px-4 py-4">

                        {assignment.subject_name || "-"}

                      </td>

                      <td className="px-4 py-4">

                        {formatDate(assignment.assignment_start_date)}

                      </td>

                      <td className="px-4 py-4">

                        {formatDate(assignment.assignment_end_date)}

                      </td>

                      <td className="px-4 py-4">

                        <span

                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${

                            assignment.is_active

                              ? "bg-emerald-500/15 text-emerald-300"

                              : "bg-slate-700 text-slate-300"

                          }`}

                        >

                          {assignment.is_active ? "Active" : "Relieved"}

                        </span>

                      </td>

                      <td className="px-4 py-4">

                        {canRelieve && assignment.is_active ? (

                          <button

                            type="button"

                            onClick={() => openRelieveModal(assignment)}

                            className="rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"

                          >

                            Relieve

                          </button>

                        ) : (

                          <span className="text-slate-500">

                            -

                          </span>

                        )}

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>



      {relieveTarget ? (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">

          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">

              Relieve subject

            </p>



            <h2 className="mt-2 text-2xl font-bold text-white">

              Relieve this teacher from subject?

            </h2>



            <p className="mt-3 text-sm text-slate-300">

              {relieveTarget.teacher_name} will be relieved from{" "}

              {relieveTarget.subject_name} ({relieveTarget.class_name}{" "}

              {relieveTarget.section_name}). The assignment record will be kept for service history.

            </p>



            <label className="mt-5 block text-sm text-slate-200">

              End Date



              <input

                type="date"

                name="assignment_end_date"

                value={relieveFormData.assignment_end_date}

                onChange={handleRelieveInputChange}

                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400"

              />

            </label>



            <div className="mt-6 flex justify-end gap-3">

              <button

                type="button"

                onClick={() => setRelieveTarget(null)}

                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white"

              >

                Cancel

              </button>



              <button

                type="button"

                onClick={handleRelieve}

                disabled={isRelieving}

                className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"

              >

                {isRelieving ? "Relieving..." : "Relieve Subject"}

              </button>

            </div>

          </div>

        </div>

      ) : null}

    </DashboardLayout>

  );

}



export default TeacherAssignments;


