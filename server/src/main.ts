import forestserver from "./server";
import Updater from "./updater";

export default class Main {
  static async start() {
    await forestserver.start({ port: 3031 });

    // Start updater after 30 seconds delay
    setTimeout(() => {
      Updater.start();
    }, 30e3);
  }

  static stop() {
    forestserver.stop();
    Updater.stop();
  }
}
