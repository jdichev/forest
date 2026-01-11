const { spawn } = require("child_process");

// Store references to all spawned processes
const processes = [];

const run = (command, args, cwd) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd: cwd,
      stdio: ["ignore", "pipe", "pipe"], // Pipe stdout/stderr for logging
      shell: true,
    });

    // Log stdout and stderr
    process.stdout.on("data", (data) => {
      console.log(`[${cwd}] ${data.toString().trim()}`);
    });

    process.stderr.on("data", (data) => {
      console.error(`[${cwd} ERROR] ${data.toString().trim()}`);
    });

    process.on("error", (error) => {
      console.error(
        `Failed to spawn process for ${command} ${args.join(" ")}:`,
        error
      );
      reject(error);
    });

    process.on("close", (code) => {
      if (code !== 0) {
        console.error(
          `Process for ${command} ${args.join(" ")} exited with code ${code}`
        );
        reject(new Error(`Process exited with code ${code}`));
      } else {
        resolve();
      }
    });

    processes.push(process); // Store process reference
  });
};

// Graceful shutdown
const shutdown = () => {
  console.log("Shutting down all processes...");

  processes.forEach((process) => {
    if (!process.killed) {
      process.kill();
    }
  });

  process.exit(0);
};

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", shutdown);

const start = async () => {
  try {
    await Promise.all([
      run("npm", ["start"], "./webapp"),
      run("npm", ["start"], "./server"),
    ]);

    // Uncomment to start the desktop app after a delay
    // await new Promise((resolve) => setTimeout(resolve, 10000));
    // await run("npm", ["start"], "./desktop");
  } catch (error) {
    console.error("Failed to start one or more processes:", error);

    shutdown(); // Shutdown on error
  }
};

start();
