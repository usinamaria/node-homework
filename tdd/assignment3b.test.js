const request = require("supertest");
const app = require("../week-3-middleware/app");
const fs = require("fs");
const path = require("path");

let logSpy;
let errorSpy;

beforeAll(() => {
	logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
	errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
	logSpy.mockRestore();
	errorSpy.mockRestore();
});

describe("Assignment 3b: Dog Rescue Middleware", () => {
	describe("Built-In Middleware", () => {
		describe("JSON parsing middleware should parse request bodies for POST /adopt", () => {
			let res;
			beforeAll(async () => {
				res = await request(app)
					.post("/adopt")
					.send({ dogName: "Sweet Pea", name: "Ellen", email: "ellen@codethedream.com" })
					.set("Content-Type", "application/json");
			});

			test("POST /adopt with valid JSON body responds with status 201", () => {
				expect(res.status).toBe(201);
			});

			test("POST /adopt returns the expected success message", () => {
				expect(res.body.message).toMatch(
					/Adoption request received. We will contact you at ellen@codethedream.com for further details./
				);
			});
		});

		describe("Static file middleware should serve images from week-3-middleware/public/images", () => {
			let res;
			const imagePath = path.join(__dirname, "../week-3-middleware/public/images/dachshund.png");

			beforeAll(() => {
				if (!fs.existsSync(imagePath)) {
					fs.mkdirSync(path.dirname(imagePath), { recursive: true });
					fs.writeFileSync(imagePath, "fake image content");
				}
			});

			beforeAll(async () => {
				res = await request(app).get("/images/dachshund.png");
			});

			test("GET /images/dachshund.png responds with status 200", () => {
				expect(res.status).toBe(200);
			});

			test("GET /images/dachshund.png returns image/png content type", () => {
				expect(res.headers["content-type"]).toMatch(/image\/png/);
			});
		});
	});

	describe("Custom Middleware", () => {
		describe("Request ID middleware should add unique request ID to all requests", () => {
			let res;

			beforeAll(async () => {
				res = await request(app).get("/dogs");
			});

			test("Response includes X-Request-Id header with unique request ID", () => {
				expect(res.headers["x-request-id"]).toBeDefined();
			});
		});

		describe("Logging middleware should log all requests with timestamp, method, path, and requestId", () => {
			test("Logs requests in format [timestamp]: METHOD PATH (requestId)", async () => {
				await request(app).get("/dogs");
				expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[.*\]: GET \/dogs \(.+\)/));
			});
		});

		describe("Error handling middleware should catch uncaught errors and return 500 with requestId", () => {
			let res;

			beforeAll(async () => {
				res = await request(app).get("/error");
			});

			test("GET /error endpoint responds with status 500", () => {
				expect(res.status).toBe(500);
			});

			test("Error response includes requestId in response body", () => {
				expect(res.body.requestId).toBeDefined();
			});

			test("Error response includes 'Internal Server Error' message", () => {
				expect(res.body.error).toBe("Internal Server Error");
			});
		});
	});

	describe("404 handler should return 404 JSON response for unmatched routes", () => {
		let res;

		beforeAll(async () => {
			res = await request(app).get("/nonexistent-route");
		});

		test("Unmatched route responds with status 404", () => {
			expect(res.status).toBe(404);
		});

		test("404 response includes 'Route not found' error message", () => {
			expect(res.body.error).toBe("Route not found");
		});

		test("404 response includes requestId in response body", () => {
			expect(res.body.requestId).toBeDefined();
		});
	});
});
