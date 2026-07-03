const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

console.log('Platform:', os.platform());
console.log('CPU:', os.cpus()[0].model);
console.log('Total Memory:', os.totalmem());

const joinedPath = path.join(sampleFilesDir, 'folder', 'file.txt');
console.log('Joined path:', joinedPath);


async function writeAndRead() {
  const demoPath = path.join(sampleFilesDir, 'demo.txt');
  await fs.promises.writeFile(demoPath, 'Hello from fs.promises!');
  const data = await fs.promises.readFile(demoPath, 'utf8');
  console.log('fs.promises read:', data);
}

writeAndRead();

const largeFilePath = path.join(sampleFilesDir, 'largefile.txt');
let largeFileContent = '';
for (let i = 1; i <= 100; i++) {
  largeFileContent += `This is a line in a large file, line number ${i}.\n`;
}
fs.writeFileSync(largeFilePath, largeFileContent);

const readStream = fs.createReadStream(largeFilePath, { highWaterMark: 1024 });

readStream.on('data', (chunk) => {
  console.log('Read chunk:', chunk.toString().slice(0, 40));
});

readStream.on('end', () => {
  console.log('Finished reading large file with streams.');
});
