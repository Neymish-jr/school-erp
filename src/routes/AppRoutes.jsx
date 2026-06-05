import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import ProtectedRoute from "./ProtectedRoute.jsx";
import Students from "../pages/students/Students";
import Classes from "../pages/classes/Classes";
import Teachers from "../pages/teachers/Teachers";
import Attendance from "../pages/attendance/Attendance";
import Subjects from "../pages/subjects/Subjects";
import TeacherAssignments from "../pages/teacherAssignments/TeacherAssignments";
import Results from "../pages/results/Results";
import ReportCard from "../pages/reportCard/ReportCard";
import Timetable from "../pages/timetable/Timetable";
import StaffPosts from "../pages/staffPosts/StaffPosts";
import AdministrativeCharges from "../pages/administrativeCharges/AdministrativeCharges";
import TeacherAdministrativeCharges from "../pages/teacherAdministrativeCharges/TeacherAdministrativeCharges";
import TeacherProfile from "../pages/teachers/TeacherProfile";
import ComingSoon from "../pages/comingSoon/ComingSoon";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classes"
          element={
            <ProtectedRoute>
              <Classes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers"
          element={
            <ProtectedRoute>
              <Teachers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teachers/:id"
          element={
            <ProtectedRoute>
              <TeacherProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects"
          element={
            <ProtectedRoute>
              <Subjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher-subjects"
          element={
            <ProtectedRoute>
              <TeacherAssignments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report-card"
          element={
            <ProtectedRoute>
              <ReportCard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/timetable"
          element={
            <ProtectedRoute>
              <Timetable />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff-posts"
          element={
            <ProtectedRoute>
              <StaffPosts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/administrative-charges"
          element={
            <ProtectedRoute>
              <AdministrativeCharges />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher-administrative-charges"
          element={
            <ProtectedRoute>
              <TeacherAdministrativeCharges />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <ComingSoon />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cashbook"
          element={
            <ProtectedRoute>
              <ComingSoon />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock-register"
          element={
            <ProtectedRoute>
              <ComingSoon />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotations"
          element={
            <ProtectedRoute>
              <ComingSoon />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <ProtectedRoute>
              <ComingSoon />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help-support"
          element={
            <ProtectedRoute>
              <div>Help & Support Section</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
