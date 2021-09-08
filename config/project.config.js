const os = require("os");

const networkInterfaces = os.networkInterfaces();

const hostAddress = Object.keys(networkInterfaces)
  .map((networkInterface) =>
    networkInterfaces[networkInterface].filter(
      (objAssignedNetworkAddress) =>
        objAssignedNetworkAddress.internal &&
        objAssignedNetworkAddress.family === "IPv4" &&
        objAssignedNetworkAddress.address
    )
  )
  .reduce((prevInterface, currentInterface) =>
    prevInterface.concat(currentInterface)
  )[0].address;

const getPorts = () => {

}

module.exports = {
  hostAddress: hostAddress,
  devServerPort: 8080,
  dataServerPort: 3030,
  getPorts,
  env: {
    DEVELOPMENT: "development",
    PRODUCTION: "production",
  },
};
