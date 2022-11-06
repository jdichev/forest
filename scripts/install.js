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
  run("npm link", "./config");
  run("npm link", "./webapp");
  run("npm link", "./server");

  run("npm install", "./config");

  run("npm link forestconfig", "./webapp");
  run("npm install", "./webapp");

  run("npm link forestconfig", "./server");
  run("npm install", "./server");

  run("npm link forestconfig forestserver forestwebapp", "./desktop");
  run("npm install", "./desktop");
};

install();
