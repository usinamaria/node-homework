const request = require("supertest");
const app = require("../week-3-middleware/app");

let errorSpy;
let warnSpy;

beforeAll(() => {
	errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(() => {
	errorSpy.mockRestore();
	warnSpy.mockRestore();
});

describe("Assignment 3c: Advanced Dog Middleware", () => {
	describe("Security Headers", () => {
		let res;

		beforeAll(async () => {
			res = await request(app).get("/dogs");
		});

		test("Response includes X-Content-Type-Options: nosniff header", () => {
			expect(res.headers["x-content-type-options"]).toBe("nosniff");
		});

		test("Response includes X-Frame-Options: DENY header", () => {
			expect(res.headers["x-frame-options"]).toBe("DENY");
		});

		test("Response includes X-XSS-Protection: 1; mode=block header", () => {
			expect(res.headers["x-xss-protection"]).toBe("1; mode=block");
		});
	});

	describe("Request Size Limiting", () => {
		test("POST /adopt with request body within 1mb limit is accepted", async () => {
			const res = await request(app)
				.post("/adopt")
				.send({ dogName: "Sweet Pea", name: "Test User", email: "test@example.com" })
				.set("Content-Type", "application/json");

			expect(res.status).toBe(201);
		});
	});

	describe("Content-Type Validation", () => {
		test("POST /adopt with text/plain content type returns 400 error", async () => {
			const res = await request(app)
				.post("/adopt")
				.send(JSON.stringify({ dogName: "Sweet Pea", name: "Test User", email: "test@example.com" }))
				.set("Content-Type", "text/plain");

			expect(res.status).toBe(400);
			expect(res.body.error).toMatch(/Content-Type must be application\/json/);
			expect(res.body.requestId).toBeDefined();
		});

		test("GET requests are not validated for content type", async () => {
			const res = await request(app).get("/dogs");

			expect(res.status).toBe(200);
		});
	});

	describe("Custom Error Classes", () => {
		describe("ValidationError", () => {
			let res;

			beforeAll(async () => {
				res = await request(app)
					.post("/adopt")
					.send({ dogName: "Sweet Pea" })
					.set("Content-Type", "application/json");
			});

			test("POST /adopt with missing required fields responds with status 400", () => {
				expect(res.status).toBe(400);
			});

			test("ValidationError response includes error message matching 'Missing required fields'", () => {
				expect(res.body.error).toMatch(/Missing required fields/);
			});

			test("ValidationError response includes requestId in response body", () => {
				expect(res.body.requestId).toBeDefined();
			});
		});

		describe("NotFoundError", () => {
			let res;

			beforeAll(async () => {
				res = await request(app)
					.post("/adopt")
					.send({ dogName: "Nonexistent Dog", name: "Test User", email: "test@example.com" })
					.set("Content-Type", "application/json");
			});

			test("POST /adopt with nonexistent or unavailable dog responds with status 404", () => {
				expect(res.status).toBe(404);
			});

			test("NotFoundError response includes error message matching 'not found or not available'", () => {
				expect(res.body.error).toMatch(/not found or not available/);
			});

			test("NotFoundError response includes requestId in response body", () => {
				expect(res.body.requestId).toBeDefined();
			});
		});
	});

	describe("Advanced Error Logging", () => {
		test("ValidationError (400) is logged with console.warn() and message starting with 'WARN: ValidationError'", async () => {
			await request(app)
				.post("/adopt")
				.send({ dogName: "Sweet Pea" })
				.set("Content-Type", "application/json");

			expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/WARN: ValidationError/));
		});

		test("NotFoundError (404) is logged with console.warn() and message starting with 'WARN: NotFoundError'", async () => {
			await request(app)
				.post("/adopt")
				.send({ dogName: "Nonexistent Dog", name: "Test User", email: "test@example.com" })
				.set("Content-Type", "application/json");

			expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/WARN: NotFoundError/));
		});

		test("Server errors (500) are logged with console.error() and message starting with 'ERROR: Error'", async () => {
			await request(app).get("/error");

			expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/ERROR: Error/));
		});
	});
});
