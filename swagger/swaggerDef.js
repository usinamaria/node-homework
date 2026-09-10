const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Node Homework API",
      version: "1.0.0",
      description:
        "API documentation for the Code the Dream Node/Express homework project (users, tasks, and analytics endpoints).",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "jwt",
          description:
            "JWT issued by /api/users/logon or /api/users/register, set as an httpOnly cookie.",
        },
        csrfHeader: {
          type: "apiKey",
          in: "header",
          name: "X-CSRF-TOKEN",
          description:
            "CSRF token returned in the logon/register response body. Required on POST, PATCH, PUT, and DELETE requests once authenticated.",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Jane Doe" },
            email: {
              type: "string",
              format: "email",
              example: "jane@example.com",
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Buy groceries" },
            isCompleted: { type: "boolean", example: false },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              example: "medium",
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Log: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            taskId: { type: "integer", example: 1 },
            status: {
              type: "string",
              example: "Started researching the API design.",
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            total: { type: "integer", example: 42 },
            pages: { type: "integer", example: 5 },
            hasNext: { type: "boolean", example: true },
            hasPrev: { type: "boolean", example: false },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./routes/*.js"],
};

module.exports = swaggerJSDoc(options);
