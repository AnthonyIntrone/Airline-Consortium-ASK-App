var sellMyStuff = artifacts.require("sellMyStuff.sol");

module.exports = function(deployer) {
  deployer.deploy(sellMyStuff);
};
