# Node.js Fundamentals

## What is Node.js?
Normally JavaScript only works inside browsers, to make websites interactive. Node.js lets that same language run on its own, so we can use it to build servers, apps, or scripts, not just browser stuff. Node.js takes that same JavaScript language and lets it run directly on a computer, like a regular program.

## How does Node.js differ from running JavaScript in the browser?
Node.js runs JavaScript outside the browser, usually on a server or a computer, while browser JavaScript runs inside a web browser.Node.js can access files, the operating system, and create servers.
Browser JavaScript can interact with web pages using the DOM (document, window) but cannot directly access the computer's files for security reasons.
In short: same JavaScript language, different runtime environments and capabilities.

## What is the V8 engine, and how does Node use it?
The V8 engine is Google's JavaScript engine, originally developed for the Google Chrome browser. It compiles JavaScript into machine code so it can run quickly.
Node.js uses the V8 engine to execute JavaScript outside the browser. Node adds its own APIs (such as file system and networking) on top of V8, allowing JavaScript to be used for server-side and backend development.

## What are some key use cases for Node.js?
Some key use cases for Node.js include:

- Building web servers and REST APIs
- Creating real-time applications 
- Developing backend services
- Working with files and databases
- Automating tasks and running scripts
- Building command-line tools (CLI applications)

Node.js is especially well suited for applications that need to handle many simultaneous connections efficiently.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.

The main difference is that CommonJS uses require() and module.exports, while ES Modules use import and export.

**CommonJS (default in Node.js):**
```js
// math.js file
function add(a, b) {
  return a + b;
}

module.exports = add;

//app.js file
const add = require("./math");

console.log(add(2, 3)); 
```

**ES Modules (supported in modern Node.js):**
```js
// math.js file
export function add(a, b) {
  return a + b;
}

// app.js file
import { add } from "./math.js";

console.log(add(2, 3)); 
``` 