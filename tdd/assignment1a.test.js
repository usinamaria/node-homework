// ============================================================================
// Week 1 — Core Tests (required)
//
// New to test files? Here's the idea: these tests run YOUR scripts the same
// way you would from the terminal (`node globals-demo.js`), capture whatever
// they print to the console, and then check that the printed text contains
// what we expect. If a check fails, Jest shows you which line and why.
//
// You don't edit this file. You make the tests pass by writing the scripts
// in your `assignment1` folder so they print the expected output.
//
// Quick tool reference:
//   path.join(...)     -> builds a file path that works on any OS
//   execSync('node x') -> runs the script and waits for it to finish
//   .toString()        -> turns the captured output into readable text
//   expect(...).toMatch(/.../) -> checks the output matches a pattern
// ============================================================================

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

describe('Week 1 Assignment — Core Tests', () => {
  // Where your work lives. From the `tdd` folder, "../assignment1" points to
  // your assignment1 folder, and sample-files is the folder inside it.
  const assignmentDir = path.join(__dirname, '../assignment1');
  const sampleFilesDir = path.join(assignmentDir, 'sample-files');

  test('globals-demo.js outputs correct globals', () => {
    const scriptPath = path.join(assignmentDir, 'globals-demo.js');
    // Run your script and capture everything it prints.
    const output = execSync(`node ${scriptPath}`).toString();
    // Your output should include each of these lines.
    expect(output).toContain(`__dirname: ${assignmentDir}`);
    expect(output).toContain(`__filename: ${scriptPath}`);
    expect(output).toMatch(/Process ID:/);
    expect(output).toMatch(/Platform:/);
    expect(output).toMatch(/Custom global variable: Hello, global!/);
  });

  test('async-demo.js demonstrates async patterns and file operations', () => {
    // Start clean: delete sample.txt so we can confirm YOUR script creates it.
    const sampleTxt = path.join(sampleFilesDir, 'sample.txt');
    if (fs.existsSync(sampleTxt)) fs.unlinkSync(sampleTxt);

    // Run your script and capture what it prints.
    const output = execSync(`node ${path.join(assignmentDir, 'async-demo.js')}`).toString();

    // Your script should have written sample.txt with this exact text.
    expect(fs.existsSync(sampleTxt)).toBe(true);
    const fileContent = fs.readFileSync(sampleTxt, 'utf8');
    expect(fileContent.trim()).toBe('Hello, async world!');

    // You should read the file three ways and print the result each time.
    // (The /i at the end means "ignore capitalization".)
    expect(output).toMatch(/callback[^\n]*hello, async world!/i);          // 1) callback style
    expect(output).toMatch(/promise[^\n]*hello, async world!/i);           // 2) .then() promise style
    expect(output).toMatch(/async[^\n]*await[^\n]*hello, async world!/i);  // 3) async/await style

    // A normal, successful run shouldn't print the word "error".
    expect(output).not.toMatch(/error/i);
  });

  test('core-modules-demo.js uses os, path, and fs.promises', () => {
    // Start clean: delete demo.txt so we can confirm YOUR script creates it.
    const demoTxt = path.join(sampleFilesDir, 'demo.txt');
    if (fs.existsSync(demoTxt)) fs.unlinkSync(demoTxt);

    // Run your script and capture what it prints.
    const output = execSync(`node ${path.join(assignmentDir, 'core-modules-demo.js')}`).toString();

    // Output from the `os` module.
    expect(output).toMatch(/Platform:/);
    expect(output).toMatch(/CPU:/);
    expect(output).toMatch(/Total Memory:/);
    // Output from the `path` module.
    expect(output).toMatch(/Joined path:/);
    // Output from reading a file with fs.promises.
    expect(output).toMatch(/fs\.promises read:/);
    // Your script should have created demo.txt along the way.
    expect(fs.existsSync(demoTxt)).toBe(true);
  });
});
