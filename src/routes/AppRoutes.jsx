import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "../context/PermissionContext";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import ProtectedPermissionRoute from "./ProtectedPermissionRoute.jsx";
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
import SchoolCharges from "../pages/schoolCharges/SchoolCharges";
import TeacherProfile from "../pages/teachers/TeacherProfile";
import ComingSoon from "../pages/comingSoon/ComingSoon";
import FinancialYears from "../pages/finance/financialYears/FinancialYears";
import BudgetStructure from "../pages/finance/budgetStructure/BudgetStructure";
import BudgetAllocations from "../pages/finance/budgetAllocations/BudgetAllocations";
import ExpenseRequests from "../pages/finance/expenseRequests/ExpenseRequests";
import ExpenseRequestDetail from "../pages/finance/expenseRequests/ExpenseRequestDetail";
import Cashbook from "../pages/finance/cashbook/Cashbook";
import Activities from "../pages/activities/Activities";
import ActivityDetail from "../pages/activities/ActivityDetail";
import StockRegister from "../pages/stockRegister/StockRegister";
import Quotations from "../pages/quotations/Quotations";
import MyResponsibilities from "../pages/myResponsibilities/MyResponsibilities";
import Unauthorized from "../pages/unauthorized/Unauthorized";
import HelpCenter from "../pages/helpSupport/HelpCenter";
import PlatformPlaceholder from "../pages/platform/PlatformPlaceholder";

const guard = (page) => <ProtectedPermissionRoute>{page}</ProtectedPermissionRoute>;

function AppRoutes() {
  return (
    <BrowserRouter>
      <PermissionProvider>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/unauthorized" element={guard(<Unauthorized />)} />

          <Route path="/dashboard" element={guard(<Dashboard />)} />
          <Route path="/students" element={guard(<Students />)} />
          <Route path="/classes" element={guard(<Classes />)} />
          <Route path="/teachers" element={guard(<Teachers />)} />
          <Route path="/teachers/:id" element={guard(<TeacherProfile />)} />
          <Route path="/subjects" element={guard(<Subjects />)} />
          <Route path="/teacher-subjects" element={guard(<TeacherAssignments />)} />
          <Route path="/attendance" element={guard(<Attendance />)} />
          <Route path="/results" element={guard(<Results />)} />
          <Route path="/report-card" element={guard(<ReportCard />)} />
          <Route path="/timetable" element={guard(<Timetable />)} />

          <Route path="/staff-posts" element={guard(<StaffPosts />)} />
          <Route path="/school-charges" element={guard(<SchoolCharges />)} />

          <Route
            path="/administrative-charges"
            element={<Navigate to="/school-charges?tab=catalog" replace />}
          />
          <Route
            path="/teacher-administrative-charges"
            element={<Navigate to="/school-charges?tab=assignments" replace />}
          />

          <Route path="/finance/financial-years" element={guard(<FinancialYears />)} />
          <Route path="/finance/budget-structure" element={guard(<BudgetStructure />)} />
          <Route path="/finance/budget-heads" element={guard(<BudgetStructure />)} />
          <Route path="/finance/budget-allocations" element={guard(<BudgetAllocations />)} />
          <Route path="/finance/expense-requests" element={guard(<ExpenseRequests />)} />
          <Route
            path="/finance/expense-requests/:id"
            element={guard(<ExpenseRequestDetail />)}
          />
          <Route path="/finance/cashbook" element={guard(<Cashbook />)} />
          <Route path="/cashbook" element={guard(<Cashbook />)} />
          <Route path="/expenses" element={guard(<ComingSoon />)} />
          <Route path="/stock-register" element={guard(<StockRegister />)} />
          <Route path="/quotations" element={guard(<Quotations />)} />
          <Route path="/my-responsibilities" element={guard(<MyResponsibilities />)} />
          <Route path="/activities" element={guard(<Activities />)} />
          <Route path="/activities/:id" element={guard(<ActivityDetail />)} />
          <Route path="/help-support" element={guard(<HelpCenter />)} />

          <Route
            path="/schools"
            element={guard(<PlatformPlaceholder module="schools" />)}
          />
          <Route
            path="/users"
            element={guard(<PlatformPlaceholder module="users" />)}
          />
          <Route
            path="/permissions"
            element={guard(<PlatformPlaceholder module="permissions" />)}
          />
          <Route
            path="/system/tenant"
            element={guard(<PlatformPlaceholder module="tenant" />)}
          />
        </Routes>
      </PermissionProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;
