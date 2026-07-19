# Lesson 2: Events, HTTP, and Express

## How do Event Emitters and Listeners work in Node.js?

**What is an event?**
An event is a signal that something has happened in the application — for example, a file finished reading, a request came in, or, in my `events.js`, that a certain amount of time has passed. Node's `EventEmitter` class lets any part of the code announce ("emit") that one of these named events occurred, without the code that triggered it needing to know who, if anyone, is listening.

**What does a listener do?**
A listener is a callback function that's registered to run whenever a specific event is emitted. You attach it with `.on("eventName", callback)`. When `.emit("eventName", data)` is called, every listener registered for that event runs, receiving whatever data was passed along. This decouples the code that produces an event from the code that reacts to it.

**My events.js file:**
```js
const EventEmitter = require("events");
const emitter = new EventEmitter();

emitter.on("time", (message) => {
  console.log("Time received:", message);
});

module.exports = emitter;

if (require.main === module) {
  setInterval(() => {
    const currentTime = new Date().toString();
    emitter.emit("time", currentTime);
  }, 5000);
}
```
Here, `"time"` is the event, and the function passed to `emitter.on` is the listener. When the file is run directly, `setInterval` emits a `"time"` event every 5 seconds, and the listener logs the message it receives.

## What are the key differences between Node's HTTP module and Express?

**What I had to do manually in sampleHTTP.js:**
- Manually inspect `req.method` and `req.url` with a chain of `if`/`else if` statements to figure out which route matched.
- Manually set the status code and headers with `res.writeHead(...)` for every response.
- Manually build and send the response body with `res.end(JSON.stringify(...))`.
- Manually collect the request body by listening to the `"data"` and `"end"` events and concatenating chunks myself, then calling `JSON.parse()` on the result.
- Manually wrap the JSON parsing in a `try/catch` so malformed input didn't crash the server, and manually write the 404 fallback for unmatched routes.

**What Express makes easier in app.js:**
- Routing is declarative — `app.get("/path", handler)` and `app.post("/path", handler)` replace the manual `if (req.method === ... && req.url === ...)` checks.
- `express.json()` middleware automatically parses JSON request bodies into `req.body`, so I don't need to manually listen for `"data"`/`"end"` events or call `JSON.parse()` myself.
- `res.status(code).json(obj)` replaces manually calling `res.writeHead()` and `res.end(JSON.stringify(...))`.
- A catch-all route (`app.all("*splat", ...)`) handles unmatched paths in one place instead of an `else` branch inside every handler.
- Express also gives built-in error handling middleware, easier route organization (routers), and a large ecosystem of middleware for things like CORS, security headers, and logging that would otherwise have to be built by hand on top of the raw `http` module.

## How does Express project layout help organize a backend?

**What app.js does:**
`app.js` is the entry point of the backend. It creates the Express app, registers global middleware (like `express.json()`), mounts routers (like `timeRouter` at `/api`), defines the catch-all 404 handler, and starts the server with `app.listen()`. It also handles server-level concerns like the `EADDRINUSE` error and graceful shutdown on `SIGINT`/`SIGTERM`.

**What the routes/ folder does:**
The `routes/` folder maps URL paths and HTTP methods to controller functions. It only says *which* handler runs for *which* path — it doesn't contain the actual response logic. For example, `routes/timeRoutes.js` wires `GET /time` and `POST /echo` to functions imported from the controller.

**What the controllers/ folder does:**
The `controllers/` folder holds the actual handler functions — the logic that runs when a route is hit, like building and sending the response. Separating this from the routes file keeps the "what URL triggers this" concern (routing) separate from the "what actually happens" concern (business logic), which makes the codebase easier to navigate and test as it grows.

**One route and the controller function it calls:**
```js
// routes/timeRoutes.js
router.get("/time", timeController.getTime);
```
```js
// controllers/timeController.js
function getTime(req, res) {
  res.status(200).json({
    time: new Date().toString(),
  });
}
```
