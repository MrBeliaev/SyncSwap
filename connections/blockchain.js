const ethers = require("ethers");
require('dotenv').config();

const net_host = process.env.MAINNET_HOST;
const provider = new ethers.providers.JsonRpcProvider(net_host)

module.exports = {
    getContract: async (address, contractName, signer = provider) => {
        const abi = require(`../abis/${contractName}.json`)
        return new ethers.Contract(address, abi, signer)
    },
    provider
}
