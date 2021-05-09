import server from "./server";
import updater from "./updater";

export default {
  start: () => {
    server.start();
    updater.start();
  },
};
