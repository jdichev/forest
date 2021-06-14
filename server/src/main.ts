import pinoLib from "pino";
import server from "./server";
import updater from "./updater";

const pino = pinoLib({
  level: "trace",
});

export default {
  start: () => {
    server.start();
    pino.debug("server start");

    setTimeout(() => {
      updater.start();
      pino.debug("updater start");
    }, 30e3);
  },
};
