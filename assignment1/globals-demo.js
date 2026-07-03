// Logging __dirname and __filename
console.log('__dirname:', __dirname);
console.log('__filename:', __filename);

// Logging process ID and platform
console.log('Process ID:', process.pid);
console.log('Platform:', process.platform);

// Attaching a custom property to global and log it
global.myCustomVar = 'Hello, global!';
console.log('Custom global variable:', global.myCustomVar);
