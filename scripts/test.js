const { execSync } = require("child_process");

const run = async (command, cwd) => {
  execSync(command, {
    cwd: cwd,
    stdio: "inherit",
  });
};

const test = async () => {
  run("npm run test", "./server");
  run("npm run test", "./webapp");
};

test();
