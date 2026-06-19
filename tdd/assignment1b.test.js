// ============================================================================
// Week 1 — Advanced Tests (OPTIONAL)
//
// These tests cover the optional streams task (Task 5). They work the same way
// as the core tests: they run your `core-modules-demo.js` script, capture what
// it prints, and check that the streaming part did its job.
//
// ============================================================================

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

describe('Week 1 Assignment — Advanced Tests (Optional)', () => {
  // Same locations as the core tests: your assignment1 folder and the
  // sample-files folder inside it.
  const assignmentDir = path.join(__dirname, '../assignment1');
  const sampleFilesDir = path.join(assignmentDir, 'sample-files');

  test('core-modules-demo.js streams a large file', () => {
    // Start clean: delete largefile.txt so we can confirm YOUR script makes it.
    const largeFile = path.join(sampleFilesDir, 'largefile.txt');
    if (fs.existsSync(largeFile)) fs.unlinkSync(largeFile);

    // Run your script and capture what it prints.
    const output = execSync(`node ${path.join(assignmentDir, 'core-modules-demo.js')}`).toString();

    // Reading with a stream happens in pieces ("chunks"), so you should print
    // at least one chunk and then a message when the stream finishes.
    expect(output).toMatch(/Read chunk:/);
    expect(output).toMatch(/Finished reading large file with streams/);

    // The large file you streamed should exist and contain at least one line.
    expect(fs.existsSync(largeFile)).toBe(true);
    const lines = fs.readFileSync(largeFile, 'utf8').split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
  });
});
