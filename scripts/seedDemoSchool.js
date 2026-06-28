#!/usr/bin/env node
/**
 * Seed PM SHRI GIC GAJA demo school — development only.
 *
 * Usage:
 *   node backend/scripts/seedDemoSchool.js
 *   node backend/scripts/seedDemoSchool.js --fresh
 *
 * Default password for all seeded users: Demo@123
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const pool = require("../db");
const {
  DEMO_ACADEMIC_YEAR,
  DEMO_DEFAULT_PASSWORD,
  DEMO_EMAIL_DOMAIN,
  DEMO_EMPLOYEE_PREFIX,
  DEMO_SCHOOL_NAME,
  SCHOOL_PROFILE,
  STAFF_POSTS,
  ADMINISTRATIVE_CHARGES,
  SUBJECTS,
  CLASS_NUMBERS,
  SECTION_NAMES,
  TEACHERS,
  CHARGE_ASSIGNMENTS,
  SUBJECT_KEY_TO_CODE,
} = require("./demoSchoolFixtures");
const {
  assertDevelopmentOnly,
  slugify,
  writeManifest,
} = require("./demoSchoolUtils");

const args = process.argv.slice(2);
const fresh = args.includes("--fresh");

const manifest = {
  school_id: null,
  teacher_ids: [],
  user_ids: [],
  staff_post_ids: [],
  charge_ids: [],
  charge_assignment_ids: [],
  staff_post_assignment_ids: [],
  subject_assignment_ids: [],
  subject_ids: [],
  class_section_ids: [],
};

const log = (message) => console.log(`[seed] ${message}`);

const runIdentityMigration = async (client) => {
  const migrationPath = path.join(
    __dirname,
    "..",
    "migrations",
    "016_teacher_identity_hardening.sql"
  );

  if (fs.existsSync(migrationPath)) {
    await client.query(fs.readFileSync(migrationPath, "utf8"));
  }
};

const tableHasColumn = async (client, tableName, columnName) => {
  const result = await client.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
    `,
    [tableName, columnName]
  );

  return result.rowCount > 0;
};

const ensureSchoolAbsent = async (client) => {
  const existing = await client.query(
    `SELECT id FROM schools WHERE school_name = $1`,
    [DEMO_SCHOOL_NAME]
  );

  if (existing.rowCount > 0 && !fresh) {
    throw new Error(
      `Demo school "${DEMO_SCHOOL_NAME}" already exists (id ${existing.rows[0].id}). Run clearDemoSchool.js or use --fresh.`
    );
  }

  if (existing.rowCount > 0 && fresh) {
    log("Fresh mode: invoke clearDemoSchool before re-seeding");
    const { execSync } = require("child_process");
    execSync("node backend/scripts/clearDemoSchool.js", {
      cwd: path.join(__dirname, "..", ".."),
      stdio: "inherit",
    });
  }
};

const seedSchool = async (client) => {
  const result = await client.query(
    `
    INSERT INTO schools (school_name, udise_code, principal_name, phone, address)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [
      SCHOOL_PROFILE.school_name,
      SCHOOL_PROFILE.udise_code,
      SCHOOL_PROFILE.principal_name,
      SCHOOL_PROFILE.phone,
      SCHOOL_PROFILE.address,
    ]
  );

  manifest.school_id = result.rows[0].id;
  log(`School created (id ${manifest.school_id}) — ${SCHOOL_PROFILE.block}, ${SCHOOL_PROFILE.district}`);
};

const seedTeachersAndUsers = async (client, passwordHash) => {
  const teacherIdByKey = {};
  const userIdByKey = {};

  for (let index = 0; index < TEACHERS.length; index += 1) {
    const teacher = TEACHERS[index];
    const employeeCode = `${DEMO_EMPLOYEE_PREFIX}TCH-${String(index + 1).padStart(3, "0")}`;
    const email = `${slugify(teacher.key)}${DEMO_EMAIL_DOMAIN}`;

    const teacherResult = await client.query(
      `
      INSERT INTO teachers (
        teacher_name,
        designation,
        qualification,
        phone,
        email,
        age,
        gender,
        school_id,
        status,
        employee_code
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
      RETURNING id, teacher_name, employee_code, qualification
      `,
      [
        teacher.name,
        teacher.designation,
        teacher.qualification,
        teacher.phone,
        email,
        teacher.age,
        teacher.gender,
        manifest.school_id,
        employeeCode,
      ]
    );

    const teacherRow = teacherResult.rows[0];
    teacherIdByKey[teacher.key] = teacherRow.id;
    manifest.teacher_ids.push(teacherRow.id);

    const userResult = await client.query(
      `
      INSERT INTO users (name, email, password, role, school_id, teacher_id)
      VALUES ($1, $2, $3, 'teacher', $4, $5)
      RETURNING id, email, teacher_id
      `,
      [teacher.name, email, passwordHash, manifest.school_id, teacherRow.id]
    );

    userIdByKey[teacher.key] = userResult.rows[0].id;
    manifest.user_ids.push(userResult.rows[0].id);
  }

  const adminEmail = `admin${DEMO_EMAIL_DOMAIN}`;
  const adminResult = await client.query(
    `
    INSERT INTO users (name, email, password, role, school_id, teacher_id)
    VALUES ($1, $2, $3, 'admin', $4, NULL)
    RETURNING id, email
    `,
    ["Demo Admin Gaja", adminEmail, passwordHash, manifest.school_id]
  );

  manifest.user_ids.push(adminResult.rows[0].id);
  manifest.admin_user_id = adminResult.rows[0].id;
  manifest.admin_email = adminEmail;

  log(`Teachers + users created (${TEACHERS.length} teachers, 1 admin)`);

  return { teacherIdByKey, userIdByKey };
};

const mapPostCategory = (staffCategory) => {
  if (staffCategory === "Teaching") {
    return "Teaching";
  }

  return "Non-Teaching";
};

const seedStaffPosts = async (client) => {
  const postIdByName = {};
  const hasTeachingFlag = await tableHasColumn(client, "staff_posts", "is_teaching_post");
  const hasStaffCategory = await tableHasColumn(client, "staff_posts", "staff_category");
  const hasPostCategory = await tableHasColumn(client, "staff_posts", "post_category");
  const hasSanctionedCount = await tableHasColumn(client, "staff_posts", "sanctioned_count");
  const hasSanctionedStrength = await tableHasColumn(
    client,
    "staff_posts",
    "sanctioned_strength"
  );

  for (const post of STAFF_POSTS) {
    const columns = ["school_id", "post_name", "post_code"];
    const values = [manifest.school_id, post.post_name, post.post_code];

    if (hasStaffCategory) {
      columns.push("staff_category");
      values.push(post.staff_category);
    }

    if (hasPostCategory) {
      columns.push("post_category");
      values.push(mapPostCategory(post.staff_category));
    }

    columns.push("appointment_nature");
    values.push(post.appointment_nature);

    if (hasSanctionedCount) {
      columns.push("sanctioned_count");
      values.push(post.sanctioned_count);
    } else if (hasSanctionedStrength) {
      columns.push("sanctioned_strength");
      values.push(post.sanctioned_count);
    }

    if (hasTeachingFlag) {
      columns.push("is_teaching_post");
      values.push(post.is_teaching_post);
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    const result = await client.query(
      `
      INSERT INTO staff_posts (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING id, post_name
      `,
      values
    );

    postIdByName[post.post_name] = result.rows[0].id;
    manifest.staff_post_ids.push(result.rows[0].id);
  }

  log(`Staff posts created (${STAFF_POSTS.length})`);
  return postIdByName;
};

const seedAdministrativeCharges = async (client) => {
  const chargeIdByName = {};

  for (const charge of ADMINISTRATIVE_CHARGES) {
    const result = await client.query(
      `
      INSERT INTO administrative_charges (charge_name, description, school_id, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id, charge_name
      `,
      [charge.charge_name, charge.description, manifest.school_id]
    );

    chargeIdByName[charge.charge_name] = result.rows[0].id;
    manifest.charge_ids.push(result.rows[0].id);
  }

  log(`Administrative charges created (${ADMINISTRATIVE_CHARGES.length})`);
  return chargeIdByName;
};

const seedStaffPostAssignments = async (client, teacherIdByKey, userIdByKey, postIdByName) => {
  let count = 0;

  for (const teacher of TEACHERS) {
    if (!teacher.staff_post) {
      continue;
    }

    const teacherId = teacherIdByKey[teacher.key];
    const staffPostId = postIdByName[teacher.staff_post];
    const assignedBy = manifest.admin_user_id || userIdByKey.principal;

    const result = await client.query(
      `
      INSERT INTO teacher_staff_post_assignments (
        school_id,
        teacher_id,
        staff_post_id,
        assignment_start_date,
        is_active,
        assigned_by_user_id,
        remarks
      )
      VALUES ($1, $2, $3, CURRENT_DATE, true, $4, $5)
      RETURNING id
      `,
      [
        manifest.school_id,
        teacherId,
        staffPostId,
        assignedBy,
        `Demo seed — ${teacher.qualification} appointment`,
      ]
    );

    manifest.staff_post_assignment_ids.push(result.rows[0].id);
    count += 1;
  }

  log(`Staff post assignments created (${count})`);
};

const seedChargeAssignments = async (client, teacherIdByKey, chargeIdByName) => {
  for (const assignment of CHARGE_ASSIGNMENTS) {
    const teacherId = teacherIdByKey[assignment.teacher_key];
    const chargeId = chargeIdByName[assignment.charge_name];

    const result = await client.query(
      `
      INSERT INTO teacher_administrative_charge_assignments (
        teacher_id,
        administrative_charge_id,
        school_id,
        academic_year,
        assigned_on,
        is_active,
        assigned_by_user_id,
        remarks
      )
      VALUES ($1, $2, $3, $4, CURRENT_DATE, true, $5, $6)
      RETURNING id
      `,
      [
        teacherId,
        chargeId,
        manifest.school_id,
        DEMO_ACADEMIC_YEAR,
        manifest.admin_user_id,
        `Demo seed assignment for ${assignment.charge_name}`,
      ]
    );

    manifest.charge_assignment_ids.push(result.rows[0].id);
  }

  const vacantCount = ADMINISTRATIVE_CHARGES.length - CHARGE_ASSIGNMENTS.length;
  log(`Charge assignments created (${CHARGE_ASSIGNMENTS.length}); vacant charges: ${vacantCount}`);
};

const seedSubjects = async (client) => {
  const subjectIdByCode = {};

  for (const subject of SUBJECTS) {
    const existing = await client.query(
      `SELECT id FROM subjects WHERE subject_code = $1`,
      [subject.subject_code]
    );

    if (existing.rowCount > 0) {
      subjectIdByCode[subject.subject_code] = existing.rows[0].id;
      manifest.subject_ids.push(existing.rows[0].id);
      continue;
    }

    const result = await client.query(
      `
      INSERT INTO subjects (subject_name, subject_code, applicable_classes)
      VALUES ($1, $2, $3::integer[])
      RETURNING id, subject_code
      `,
      [subject.subject_name, subject.subject_code, subject.applicable_classes]
    );

    subjectIdByCode[subject.subject_code] = result.rows[0].id;
    manifest.subject_ids.push(result.rows[0].id);
  }

  log(`Subjects ready (${SUBJECTS.length})`);
  return subjectIdByCode;
};

const seedClassSections = async (client) => {
  const sectionIdByKey = {};

  for (const classNumber of CLASS_NUMBERS) {
    for (const sectionName of SECTION_NAMES) {
      const className = String(classNumber);
      const key = `${className}-${sectionName}`;

      const existing = await client.query(
        `
        SELECT id
        FROM class_sections
        WHERE class_name = $1 AND section_name = $2
        `,
        [className, sectionName]
      );

      if (existing.rowCount > 0) {
        sectionIdByKey[key] = existing.rows[0].id;
        if (!manifest.class_section_ids.includes(existing.rows[0].id)) {
          manifest.class_section_ids.push(existing.rows[0].id);
        }
        continue;
      }

      const result = await client.query(
        `
        INSERT INTO class_sections (class_name, section_name)
        VALUES ($1, $2)
        RETURNING id
        `,
        [className, sectionName]
      );

      sectionIdByKey[key] = result.rows[0].id;
      manifest.class_section_ids.push(result.rows[0].id);
    }
  }

  log(`Class sections ready (${CLASS_NUMBERS.length} classes × ${SECTION_NAMES.length} sections)`);
  return sectionIdByKey;
};

const seedTeacherSubjectAssignments = async (client, teacherIdByKey, subjectIdByCode, sectionIdByKey) => {
  let count = 0;

  for (const teacher of TEACHERS) {
    if (!teacher.subject_key) {
      continue;
    }

    const subjectCode = SUBJECT_KEY_TO_CODE[teacher.subject_key];
    const subjectId = subjectIdByCode[subjectCode];
    const teacherId = teacherIdByKey[teacher.key];

    if (!subjectId || !teacherId) {
      continue;
    }

    const subjectMeta = SUBJECTS.find((item) => item.subject_code === subjectCode);
    const targetClasses = subjectMeta?.applicable_classes || CLASS_NUMBERS;

    for (const classNumber of targetClasses) {
      for (const sectionName of SECTION_NAMES) {
        const sectionKey = `${classNumber}-${sectionName}`;
        const classSectionId = sectionIdByKey[sectionKey];

        if (!classSectionId) {
          continue;
        }

        const existing = await client.query(
          `
          SELECT id
          FROM teacher_subject_assignments
          WHERE teacher_id = $1
            AND class_section_id = $2
            AND subject_id = $3
            AND is_active = true
          `,
          [teacherId, classSectionId, subjectId]
        );

        if (existing.rowCount > 0) {
          continue;
        }

        const result = await client.query(
          `
          INSERT INTO teacher_subject_assignments (
            teacher_id,
            class_section_id,
            subject_id,
            assignment_start_date,
            is_active
          )
          VALUES ($1, $2, $3, CURRENT_DATE, true)
          RETURNING id
          `,
          [teacherId, classSectionId, subjectId]
        );

        manifest.subject_assignment_ids.push(result.rows[0].id);
        count += 1;
      }
    }
  }

  log(`Teacher subject assignments created (${count})`);
};

const printSummary = (teacherIdByKey, userIdByKey) => {
  console.log("\n=== Demo School Seed Summary ===");
  console.log(`School: ${DEMO_SCHOOL_NAME} (id ${manifest.school_id})`);
  console.log(`District: ${SCHOOL_PROFILE.district} | Block: ${SCHOOL_PROFILE.block}`);
  console.log(`Admin login: ${manifest.admin_email} / ${DEMO_DEFAULT_PASSWORD}`);
  console.log(`Teachers seeded: ${manifest.teacher_ids.length}`);
  console.log(`Users seeded: ${manifest.user_ids.length}`);
  console.log(`Staff posts: ${manifest.staff_post_ids.length}`);
  console.log(`Charges: ${manifest.charge_ids.length} (${CHARGE_ASSIGNMENTS.length} assigned)`);
  console.log(`Subject assignments: ${manifest.subject_assignment_ids.length}`);
  console.log("\nSample teacher logins (password: Demo@123):");
  TEACHERS.slice(0, 5).forEach((teacher) => {
    const email = `${slugify(teacher.key)}${DEMO_EMAIL_DOMAIN}`;
    console.log(`  - ${teacher.name} (${teacher.qualification}): ${email} → teacher_id ${teacherIdByKey[teacher.key]}`);
  });
  console.log("\nManifest written for clearDemoSchool.js");
};

const run = async () => {
  assertDevelopmentOnly();

  const client = await pool.connect();
  const passwordHash = await bcrypt.hash(DEMO_DEFAULT_PASSWORD, 10);

  try {
    await client.query("BEGIN");
    await runIdentityMigration(client);
    await ensureSchoolAbsent(client);
    await seedSchool(client);

    const { teacherIdByKey, userIdByKey } = await seedTeachersAndUsers(
      client,
      passwordHash
    );
    const postIdByName = await seedStaffPosts(client);
    const chargeIdByName = await seedAdministrativeCharges(client);

    await seedStaffPostAssignments(
      client,
      teacherIdByKey,
      userIdByKey,
      postIdByName
    );
    await seedChargeAssignments(client, teacherIdByKey, chargeIdByName);

    const subjectIdByCode = await seedSubjects(client);
    const sectionIdByKey = await seedClassSections(client);
    await seedTeacherSubjectAssignments(
      client,
      teacherIdByKey,
      subjectIdByCode,
      sectionIdByKey
    );

    await client.query("COMMIT");
    writeManifest(manifest);
    printSummary(teacherIdByKey, userIdByKey);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
