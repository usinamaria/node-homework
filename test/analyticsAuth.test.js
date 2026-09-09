require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const crypto = require("crypto");
const util = require("util");
const request = require("supertest");
const httpMocks = require("node-mocks-http");
const EventEmitter = require("events").EventEmitter;
const prisma = require("../db/prisma");
const { app, server } = require("../app");
const requireManager = require("../middleware/requireManager");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

const PASSWORD = "Pa$$word20";
let managerAgent;
let staffAgent;

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  const hashedPassword = await hashPassword(PASSWORD);
  await prisma.user.create({
    data: { name: "Maria Manager", email: "manager@example.com", hashedPassword, roles: "manager" },
  });
  await prisma.user.create({
    data: { name: "Sam Staff", email: "staff@example.com", hashedPassword },
  });
  managerAgent = request.agent(app);
  staffAgent = request.agent(app);
});

afterAll(async () => {
  await prisma.$disconnect();
  server.close();
});

describe("Testing the requireManager middleware directly", () => {
  it("66. Returns a 401 if req.user has no roles.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: 1 };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(requireManager, req, res);
    expect(res.statusCode).toBe(401);
  });
  it("67. Returns a 401 if req.user.roles does not include manager.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: 1, roles: "editor,viewer" };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(requireManager, req, res);
    expect(res.statusCode).toBe(401);
  });
  it("68. Calls next() if req.user.roles includes manager.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: 1, roles: "manager" };
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    const next = await waitForRouteHandlerCompletion(requireManager, req, res);
    expect(next).toHaveBeenCalled();
  });
});

describe("Logging on as a manager and as a non-manager", () => {
  it("69. A user with the manager role can log on.", async () => {
    const res = await managerAgent
      .post("/api/users/logon")
      .send({ email: "manager@example.com", password: PASSWORD });
    expect(res.status).toBe(200);
  });
  it("70. A user without the manager role can log on.", async () => {
    const res = await staffAgent
      .post("/api/users/logon")
      .send({ email: "staff@example.com", password: PASSWORD });
    expect(res.status).toBe(200);
  });
});

describe("Testing manager-only access on /api/analytics", () => {
  it("71. A manager can access /api/analytics/users.", async () => {
    const res = await managerAgent.get("/api/analytics/users");
    expect(res.status).toBe(200);
  });
  it("72. A non-manager gets a 401 from /api/analytics/users.", async () => {
    const res = await staffAgent.get("/api/analytics/users");
    expect(res.status).toBe(401);
  });
  it("73. A non-manager gets a 401 from /api/analytics/users/:id.", async () => {
    const res = await staffAgent.get("/api/analytics/users/1");
    expect(res.status).toBe(401);
  });
  it("74. A non-manager gets a 401 from /api/analytics/tasks/search.", async () => {
    const res = await staffAgent.get("/api/analytics/tasks/search?q=ab");
    expect(res.status).toBe(401);
  });
  it("75. Without logging on at all, /api/analytics/users returns a 401.", async () => {
    const res = await request(app).get("/api/analytics/users");
    expect(res.status).toBe(401);
  });
});
