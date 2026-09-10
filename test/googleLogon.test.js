require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const httpMocks = require("node-mocks-http");
const EventEmitter = require("events").EventEmitter;
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");
const { googleLogon } = require("../controllers/userController");

// The rest of the Google OAuth flow (exchanging a real authorization code and
// verifying the resulting id token) requires live network access to Google and a
// real front end to obtain the code, so it isn't practical to cover here.
describe("Testing Google OAuth logon input validation", () => {
  it("96. Returns a 400 if authorizationCode is missing from the request body.", async () => {
    const req = httpMocks.createRequest({ method: "POST", body: {} });
    const res = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(googleLogon, req, res);
    expect(res.statusCode).toBe(400);
  });
});
