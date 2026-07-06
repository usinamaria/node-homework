const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'sample-files', 'sample.txt');

fs.writeFileSync(filePath, 'Hello, async world!');

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Callback read:', data);
});

// Callback hell example (for illustration only, not run):
// Chaining multiple async steps by nesting callbacks inside callbacks
// makes the code grow to the right with every extra step, is hard to
// read top-to-bottom, and forces duplicate error handling at every level.
// Adding, removing, or reordering a step means restructuring the whole
// nested block, which is what makes this pattern so error-prone to maintain.
//
// fs.readFile(filePath, 'utf8', (err, data) => {
//   if (err) return console.error(err);
//   fs.readFile(filePath, 'utf8', (err, data) => {
//     if (err) return console.error(err);
//     fs.readFile(filePath, 'utf8', (err, data) => {
//       if (err) return console.error(err);
//       console.log('Nested callback read:', data);
//     });
//   });
// });

fs.promises
  .readFile(filePath, 'utf8')
  .then((data) => {
    console.log('Promise read:', data);
  })
  .catch((err) => {
    console.error(err);
  });

async function readWithAsyncAwait() {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    console.log('Async/Await read:', data);
  } catch (err) {
    console.error(err);
  }
}

readWithAsyncAwait();
