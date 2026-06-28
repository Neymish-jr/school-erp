/**
 * Demo school fixture data for development seeding.
 * Marker: employee codes PMG-*, emails *@pmshri-gaja.demo.local
 */

const DEMO_SCHOOL_NAME = "PM SHRI GIC GAJA";
const DEMO_EMAIL_DOMAIN = "@pmshri-gaja.demo.local";
const DEMO_EMPLOYEE_PREFIX = "PMG-";
const DEMO_UDISE = "05123456789";
const DEMO_DEFAULT_PASSWORD = "Demo@123";
const DEMO_ACADEMIC_YEAR = "2025-26";

const SCHOOL_PROFILE = {
  school_name: DEMO_SCHOOL_NAME,
  udise_code: DEMO_UDISE,
  principal_name: "Shri Rajesh Nautiyal",
  phone: "9410123456",
  address: "Gaja, Chamba Block, Tehri Garhwal District, Uttarakhand",
  district: "Tehri Garhwal",
  block: "Chamba",
};

const STAFF_POSTS = [
  { post_name: "Principal", post_code: "PMG-PRIN", staff_category: "Administrative", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: false },
  { post_name: "Lecturer Maths", post_code: "PMG-MATH", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "Lecturer English", post_code: "PMG-ENG", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "Lecturer Physics", post_code: "PMG-PHY", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "Lecturer Chemistry", post_code: "PMG-CHEM", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "Lecturer Biology", post_code: "PMG-BIO", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "Lecturer Hindi", post_code: "PMG-HIN", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "Lecturer History", post_code: "PMG-HIST", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "Lecturer Geography", post_code: "PMG-GEO", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "PET", post_code: "PMG-PET", staff_category: "Teaching", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: true },
  { post_name: "Clerk", post_code: "PMG-CLK", staff_category: "Office", appointment_nature: "Permanent", sanctioned_count: 1, is_teaching_post: false },
  { post_name: "Accountant", post_code: "PMG-ACC", staff_category: "Office", appointment_nature: "Contractual", sanctioned_count: 1, is_teaching_post: false },
  { post_name: "Lab Assistant", post_code: "PMG-LAB", staff_category: "Support", appointment_nature: "Contractual", sanctioned_count: 1, is_teaching_post: false },
];

const ADMINISTRATIVE_CHARGES = [
  { charge_name: "PM SHRI Incharge", description: "PM SHRI programme coordination" },
  { charge_name: "Examination Incharge", description: "Board and internal examinations" },
  { charge_name: "Library Incharge", description: "School library operations" },
  { charge_name: "Sports Incharge", description: "Sports and physical education events" },
  { charge_name: "Mid Day Meal Incharge", description: "MDM scheme monitoring" },
  { charge_name: "Scholarship Incharge", description: "Scholarship applications and records" },
  { charge_name: "UDISE Incharge", description: "UDISE+ data and compliance" },
  { charge_name: "Discipline Incharge", description: "Student discipline and conduct" },
  { charge_name: "Time Table Incharge", description: "School timetable preparation" },
];

/** Charges left vacant intentionally */
const VACANT_CHARGE_NAMES = new Set([
  "Mid Day Meal Incharge",
  "Scholarship Incharge",
  "Discipline Incharge",
]);

const SUBJECTS = [
  { subject_name: "Mathematics", subject_code: "PMG-MAT", applicable_classes: [6, 7, 8, 9, 10, 11, 12] },
  { subject_name: "English", subject_code: "PMG-ENG", applicable_classes: [6, 7, 8, 9, 10, 11, 12] },
  { subject_name: "Physics", subject_code: "PMG-PHY", applicable_classes: [9, 10, 11, 12] },
  { subject_name: "Chemistry", subject_code: "PMG-CHEM", applicable_classes: [9, 10, 11, 12] },
  { subject_name: "Biology", subject_code: "PMG-BIO", applicable_classes: [9, 10, 11, 12] },
  { subject_name: "Hindi", subject_code: "PMG-HIN", applicable_classes: [6, 7, 8, 9, 10, 11, 12] },
  { subject_name: "History", subject_code: "PMG-HIS", applicable_classes: [6, 7, 8, 9, 10, 11, 12] },
  { subject_name: "Geography", subject_code: "PMG-GEO", applicable_classes: [6, 7, 8, 9, 10, 11, 12] },
  { subject_name: "Physical Education", subject_code: "PMG-PED", applicable_classes: [6, 7, 8, 9, 10, 11, 12] },
  { subject_name: "Computer Science", subject_code: "PMG-CS", applicable_classes: [9, 10, 11, 12] },
];

const CLASS_NUMBERS = [6, 7, 8, 9, 10, 11, 12];
const SECTION_NAMES = ["A", "B"];

/**
 * 18 teachers — mix of Permanent / Guest / Contractual (stored in qualification).
 * staffPostKey maps to STAFF_POSTS post_code suffix logic via post_name match.
 */
const TEACHERS = [
  { key: "principal", name: "Shri Rajesh Nautiyal", designation: "Principal", qualification: "Permanent", gender: "Male", age: 48, phone: "9410100001", staff_post: "Principal", subject_key: null },
  { key: "maths", name: "Smt. Anjali Rawat", designation: "Lecturer Maths", qualification: "Permanent", gender: "Female", age: 36, phone: "9410100002", staff_post: "Lecturer Maths", subject_key: "mathematics" },
  { key: "english", name: "Shri Deepak Semwal", designation: "Lecturer English", qualification: "Permanent", gender: "Male", age: 34, phone: "9410100003", staff_post: "Lecturer English", subject_key: "english" },
  { key: "physics", name: "Shri Manoj Kukreti", designation: "Lecturer Physics", qualification: "Permanent", gender: "Male", age: 38, phone: "9410100004", staff_post: "Lecturer Physics", subject_key: "physics" },
  { key: "chemistry", name: "Smt. Pooja Chauhan", designation: "Lecturer Chemistry", qualification: "Guest", gender: "Female", age: 29, phone: "9410100005", staff_post: "Lecturer Chemistry", subject_key: "chemistry" },
  { key: "biology", name: "Shri Vikas Rana", designation: "Lecturer Biology", qualification: "Contractual", gender: "Male", age: 31, phone: "9410100006", staff_post: "Lecturer Biology", subject_key: "biology" },
  { key: "hindi", name: "Smt. Meena Dobriyal", designation: "Lecturer Hindi", qualification: "Permanent", gender: "Female", age: 40, phone: "9410100007", staff_post: "Lecturer Hindi", subject_key: "hindi" },
  { key: "history", name: "Shri Narendra Singh", designation: "Lecturer History", qualification: "Guest", gender: "Male", age: 33, phone: "9410100008", staff_post: "Lecturer History", subject_key: "history" },
  { key: "geography", name: "Smt. Kiran Bisht", designation: "Lecturer Geography", qualification: "Contractual", gender: "Female", age: 28, phone: "9410100009", staff_post: "Lecturer Geography", subject_key: "geography" },
  { key: "pet", name: "Shri Sandeep Gusain", designation: "PET", qualification: "Permanent", gender: "Male", age: 35, phone: "9410100010", staff_post: "PET", subject_key: "physical_education" },
  { key: "clerk", name: "Smt. Rekha Maithani", designation: "Clerk", qualification: "Permanent", gender: "Female", age: 42, phone: "9410100011", staff_post: "Clerk", subject_key: null },
  { key: "accountant", name: "Shri Hemant Joshi", designation: "Accountant", qualification: "Contractual", gender: "Male", age: 37, phone: "9410100012", staff_post: "Accountant", subject_key: null },
  { key: "lab", name: "Shri Ramesh Chand", designation: "Lab Assistant", qualification: "Guest", gender: "Male", age: 32, phone: "9410100013", staff_post: "Lab Assistant", subject_key: null },
  { key: "tgt1", name: "Smt. Neha Thapliyal", designation: "TGT Science", qualification: "Guest", gender: "Female", age: 27, phone: "9410100014", staff_post: null, subject_key: "biology" },
  { key: "tgt2", name: "Shri Aman Negi", designation: "TGT Maths", qualification: "Contractual", gender: "Male", age: 26, phone: "9410100015", staff_post: null, subject_key: "mathematics" },
  { key: "tgt3", name: "Smt. Divya Panwar", designation: "TGT English", qualification: "Guest", gender: "Female", age: 25, phone: "9410100016", staff_post: null, subject_key: "english" },
  { key: "cs", name: "Shri Rohit Baluni", designation: "Lecturer Computer Science", qualification: "Contractual", gender: "Male", age: 30, phone: "9410100017", staff_post: null, subject_key: "computer_science" },
  { key: "lib", name: "Smt. Asha Devi", designation: "Library Support", qualification: "Guest", gender: "Female", age: 39, phone: "9410100018", staff_post: null, subject_key: null },
];

const CHARGE_ASSIGNMENTS = [
  { charge_name: "PM SHRI Incharge", teacher_key: "principal" },
  { charge_name: "Examination Incharge", teacher_key: "maths" },
  { charge_name: "Library Incharge", teacher_key: "english" },
  { charge_name: "Sports Incharge", teacher_key: "pet" },
  { charge_name: "UDISE Incharge", teacher_key: "clerk" },
  { charge_name: "Time Table Incharge", teacher_key: "hindi" },
];

const SUBJECT_KEY_TO_CODE = {
  mathematics: "PMG-MAT",
  english: "PMG-ENG",
  physics: "PMG-PHY",
  chemistry: "PMG-CHEM",
  biology: "PMG-BIO",
  hindi: "PMG-HIN",
  history: "PMG-HIS",
  geography: "PMG-GEO",
  physical_education: "PMG-PED",
  computer_science: "PMG-CS",
};

module.exports = {
  DEMO_SCHOOL_NAME,
  DEMO_EMAIL_DOMAIN,
  DEMO_EMPLOYEE_PREFIX,
  DEMO_UDISE,
  DEMO_DEFAULT_PASSWORD,
  DEMO_ACADEMIC_YEAR,
  SCHOOL_PROFILE,
  STAFF_POSTS,
  ADMINISTRATIVE_CHARGES,
  VACANT_CHARGE_NAMES,
  SUBJECTS,
  CLASS_NUMBERS,
  SECTION_NAMES,
  TEACHERS,
  CHARGE_ASSIGNMENTS,
  SUBJECT_KEY_TO_CODE,
};
