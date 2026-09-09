require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; // point to the test database!
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const EventEmitter = require("events").EventEmitter;
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const {
  show,
  deleteTask,
  addLog,
  updateByFilter,
  deleteByFilter,
  bulkUpdateByIds,
  bulkDeleteByIds,
} = require("../controllers/taskController");

let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;

beforeAll(async () => {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  user1 = await prisma.user.create({
    data: { name: "Bob", email: "bob@sample.com", hashedPassword: "nonsense" },
  });
  user2 = await prisma.user.create({
    data: { name: "Alice", email: "alice@sample.com", hashedPassword: "nonsense" },
  });
});

afterAll(() => {
  prisma.$disconnect();
});

describe("testing progress logs on a task", () => {
  let task1 = null;

  beforeAll(async () => {
    task1 = await prisma.task.create({
      data: { title: "Task with logs", userId: user1.id },
    });
  });

  it("76. User1 can add a log entry to their own task.", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    req.user = user1;
    req.params = { id: task1.id.toString() };
    req.body = { status: "Started working on it" };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(addLog, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });
  it("77. The created log entry has the expected status.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.status).toBe("Started working on it");
  });
  it("78. User2 can't add a log entry to user1's task (404).", async () => {
    const req = httpMocks.createRequest({ method: "POST" });
    req.user = user2;
    req.params = { id: task1.id.toString() };
    req.body = { status: "Trying to sneak in" };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(addLog, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
  it("79. Retrieving the task with ?include=logs returns the log entries.", async () => {
    const req = httpMocks.createRequest({ method: "GET", query: { include: "logs" } });
    req.user = user1;
    req.params = { id: task1.id.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveData.Log).toHaveLength(1);
    expect(saveData.Log[0].status).toBe("Started working on it");
  });
  it("80. Retrieving the task without ?include=logs omits the Log array.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = user1;
    req.params = { id: task1.id.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveData.Log).not.toBeDefined();
  });
  it("81. Deleting a task with log entries still succeeds (cascading delete).", async () => {
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = user1;
    req.params = { id: task1.id.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });
});

describe("testing bulk update/delete by filter query parameters", () => {
  let taskA = null;
  let taskB = null;
  let taskC = null;
  let otherUserTask = null;

  beforeAll(async () => {
    taskA = await prisma.task.create({
      data: { title: "Filter task A", userId: user1.id, priority: "low", isCompleted: false },
    });
    taskB = await prisma.task.create({
      data: { title: "Filter task B", userId: user1.id, priority: "low", isCompleted: false },
    });
    taskC = await prisma.task.create({
      data: { title: "Filter task C", userId: user1.id, priority: "high", isCompleted: false },
    });
    otherUserTask = await prisma.task.create({
      data: { title: "Other user's low task", userId: user2.id, priority: "low", isCompleted: false },
    });
  });

  it("82. updateByFilter without any filter query parameter returns a 400.", async () => {
    const req = httpMocks.createRequest({ method: "PATCH", query: {} });
    req.user = user1;
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(updateByFilter, req, saveRes);
    expect(saveRes.statusCode).toBe(400);
  });
  it("83. updateByFilter with priority=low marks only user1's low-priority tasks completed.", async () => {
    const req = httpMocks.createRequest({ method: "PATCH", query: { priority: "low" } });
    req.user = user1;
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(updateByFilter, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveRes.statusCode).toBe(200);
    expect(saveData.tasksUpdated).toBe(2);
  });
  it("84. taskA and taskB are now marked completed; taskC (high priority) was not affected.", async () => {
    const refreshedA = await prisma.task.findUnique({ where: { id: taskA.id } });
    const refreshedB = await prisma.task.findUnique({ where: { id: taskB.id } });
    const refreshedC = await prisma.task.findUnique({ where: { id: taskC.id } });
    expect(refreshedA.isCompleted).toBe(true);
    expect(refreshedB.isCompleted).toBe(true);
    expect(refreshedC.isCompleted).toBe(false);
  });
  it("85. user2's low-priority task was not affected.", async () => {
    const refreshed = await prisma.task.findUnique({ where: { id: otherUserTask.id } });
    expect(refreshed.isCompleted).toBe(false);
  });
  it("86. deleteByFilter without any filter query parameter returns a 400.", async () => {
    const req = httpMocks.createRequest({ method: "DELETE", query: {} });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteByFilter, req, saveRes);
    expect(saveRes.statusCode).toBe(400);
  });
  it("87. deleteByFilter with isCompleted=true deletes user1's completed tasks only.", async () => {
    const req = httpMocks.createRequest({ method: "DELETE", query: { isCompleted: "true" } });
    req.user = user1;
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteByFilter, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveRes.statusCode).toBe(200);
    expect(saveData.tasksDeleted).toBe(2);
  });
  it("88. taskC and user2's task still exist.", async () => {
    const remainingC = await prisma.task.findUnique({ where: { id: taskC.id } });
    const remainingOther = await prisma.task.findUnique({ where: { id: otherUserTask.id } });
    expect(remainingC).not.toBeNull();
    expect(remainingOther).not.toBeNull();
  });
});

describe("testing bulk update/delete by an id array", () => {
  let taskX = null;
  let taskY = null;
  let otherUserTask = null;

  beforeAll(async () => {
    taskX = await prisma.task.create({ data: { title: "Bulk id task X", userId: user1.id } });
    taskY = await prisma.task.create({ data: { title: "Bulk id task Y", userId: user1.id } });
    otherUserTask = await prisma.task.create({ data: { title: "Other user's task", userId: user2.id } });
  });

  it("89. bulkUpdateByIds without an ids array returns a 400.", async () => {
    const req = httpMocks.createRequest({ method: "PATCH" });
    req.user = user1;
    req.body = { isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdateByIds, req, saveRes);
    expect(saveRes.statusCode).toBe(400);
  });
  it("90. User1 can bulk-update taskX and taskY by id.", async () => {
    const req = httpMocks.createRequest({ method: "PATCH" });
    req.user = user1;
    req.body = { ids: [taskX.id, taskY.id], isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdateByIds, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveRes.statusCode).toBe(200);
    expect(saveData.tasksUpdated).toBe(2);
  });
  it("91. Including another user's task id in the update array does not update it.", async () => {
    const req = httpMocks.createRequest({ method: "PATCH" });
    req.user = user1;
    req.body = { ids: [otherUserTask.id], isCompleted: true };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkUpdateByIds, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveData.tasksUpdated).toBe(0);
  });
  it("92. That other user's task is confirmed still isCompleted: false.", async () => {
    const refreshed = await prisma.task.findUnique({ where: { id: otherUserTask.id } });
    expect(refreshed.isCompleted).toBe(false);
  });
  it("93. bulkDeleteByIds without an ids array returns a 400.", async () => {
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = user1;
    req.body = {};
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkDeleteByIds, req, saveRes);
    expect(saveRes.statusCode).toBe(400);
  });
  it("94. User1 can bulk-delete taskX and taskY by id; the other user's id is ignored.", async () => {
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = user1;
    req.body = { ids: [taskX.id, taskY.id, otherUserTask.id] };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(bulkDeleteByIds, req, saveRes);
    saveData = saveRes._getJSONData();
    expect(saveRes.statusCode).toBe(200);
    expect(saveData.tasksDeleted).toBe(2);
  });
  it("95. The other user's task still exists after the bulk delete.", async () => {
    const remaining = await prisma.task.findUnique({ where: { id: otherUserTask.id } });
    expect(remaining).not.toBeNull();
  });
});
