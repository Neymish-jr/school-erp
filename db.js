require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({

  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,

});

pool.connect()
  .then((client) => {
    console.log("PostgreSQL Connected ✅");
    client.release();
  })
  .catch((err) => console.error("DB Connection Error ❌", err));
console.log("USER:", process.env.postgres);
console.log("PASSWORD:", process.env.postgres123);
module.exports = pool;