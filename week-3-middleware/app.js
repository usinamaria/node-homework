const express = require("express");
const dogsRouter = require("./routes/dogs");

const app = express();

// Assignment 3b and 3c ask you to add middleware in this file.




app.use("/", dogsRouter);// Do not remove this line


if (require.main === module) {
  app.listen(3000, () => {
    console.log("Dog rescue app is listening on port 3000...");
  });
}

module.exports = app;

