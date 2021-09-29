import { ChildProcess, fork } from "child_process";
import path from "path";

const run = (program: string) => {
  return fork(program, [], {
    stdio: "inherit",
  });
};

export default class Main {
  private static serverStarter: ChildProcess;
  private static updaterStarter: ChildProcess;
  
  static start() {
    this.serverStarter = run(path.join(__dirname, "scripts", "server-starter"));
    
    this.updaterStarter = run(
      path.join(__dirname, "scripts", "updater-starter")
    );
  }

  static stop() {
    this.serverStarter.kill();
    this.updaterStarter.kill();
  }
}
