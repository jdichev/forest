const { execSync } = require("child_process");

const run = async (command, cwd) => {
  execSync(command, {
    cwd: cwd,
    stdio: "inherit",
  });
};

const install = async () => {
  run("npm run build", "./webapp");

  run("npm run build", "./server");

  run("npm run build", "./desktop");
};

install();
