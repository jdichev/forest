const { spawn } = require("child_process");

const run = async (command, args, cwd) => {
  spawn(command, args, {
    cwd: cwd,
    stdio: "inherit",
  });
};

const start = () => {
  run("npm", ["start"], "./webapp");
  run("npm", ["start"], "./server");

  // Uncomment the following lines to start the desktop app after a delay
  // setTimeout(() => {
  //   run("npm", ["start"], "./desktop");
  // }, 10e3);
};

start();
