const { execSync } = require("child_process");

const run = async (command, cwd) => {
  console.log("-".repeat(80));
  console.log(`Running "${command}" in "${cwd}"`);
  console.log("-".repeat(80));

  execSync(command, {
    cwd: cwd,
    stdio: "inherit",
  });
};

const install = async () => {
  run("npm install", "./config");

  run("npm install", "./helpers/fetch-feed");

  run("npm install", "./webapp");

  run("npm install", "./server");

  run("npm install", "./desktop");
};

install();
