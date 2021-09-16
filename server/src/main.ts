import pinoLib from "pino";
import server from "./server";
import Updater from "./updater";

const pino = pinoLib({
  level: "trace",
});

export default {
  start: async () => {
    await server.start();
    pino.debug("Server start executed");

    setTimeout(() => {
      Updater.start();
      pino.debug("Updater start executed");
    }, 30e3);
  },

  stop: async () => {
    Updater.stop();
    await server.stop();
  },
};
