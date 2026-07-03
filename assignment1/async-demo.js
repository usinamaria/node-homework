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
