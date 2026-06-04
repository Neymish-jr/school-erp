const XLSX = require("xlsx");
const pool = require("../db");

const importStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = XLSX.readFile(req.file.path);

    const sheetName = workbook.SheetNames[0];

    const students = XLSX.utils.sheet_to_json(
      workbook.Sheets[sheetName]
    );

    let imported = 0;

    for (const student of students) {
      if (
        !student["Name"] ||
        !student["Gender"] ||
        !student["Class"] ||
        !student["Section"]
      ) {
        continue;
      }

      await pool.query(
        `
        INSERT INTO students
        (
          name,
          gender,
          category,
          student_class,
          section,
          school_id,
          is_active
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          student["Name"],
          student["Gender"],
          student["Social Category"] || "General",
          student["Class"],
          student["Section"],
          1,
          true,
        ]
      );

      imported++;
    }

    return res.status(200).json({
      success: true,
      imported,
      message: "Students imported successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const downloadTemplate = async (req, res) => {
  const data = [
    {
      Name: "",
      Gender: "",
      Category: "",
      Class: "",
      Section: "",
    },
  ];

  const workbook = XLSX.utils.book_new();

  const worksheet =
    XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Students"
  );

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=students_template.xlsx"
  );

  res.send(buffer);
};
const exportStudents = async (
  req,
  res
) => {
  const result =
    await pool.query(`
      SELECT
      name,
      gender,
      category,
      student_class,
      section
      FROM students
    `);

  const workbook =
    XLSX.utils.book_new();

  const worksheet =
    XLSX.utils.json_to_sheet(
      result.rows
    );

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Students"
  );

  const buffer = XLSX.write(
    workbook,
    {
      type: "buffer",
      bookType: "xlsx",
    }
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=students.xlsx"
  );

  res.send(buffer);
};

module.exports = {
  importStudents,
  downloadTemplate,
  exportStudents,
};