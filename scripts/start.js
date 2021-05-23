const { spawn } = require("child_process");

const run = async (command, args, cwd) => {
  const started = spawn(command, args, {
    cwd: cwd,
    stdio: "inherit",
  });
};

const start = () => {
  run("npm", ["start"], "./webapp");
  run("npm", ["start"], "./server");
  run("npm", ["start"], "./desktop");
};

start();
