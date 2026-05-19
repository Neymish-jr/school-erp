const swaggerJsdoc = require("swagger-jsdoc");

const options = {

  definition: {
    openapi: "3.0.0",

    info: {
      title: "School ERP API",
      version: "1.0.0",
      description: "ERP Backend API Documentation"
    },

    servers: [
      {
        url: "http://localhost:3000"
      }
    ]
  },

  apis: ["./routes/*.js"]

};

const specs = swaggerJsdoc(options);

module.exports = specs;