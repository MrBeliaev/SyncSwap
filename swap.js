const { ethers } = require('ethers');
const { readFile } = require('fs/promises');
const { randomArr, getRandomInt } = require('./helpers/random')
const { getContract, provider } = require('./connections/blockchain')
const config = require('./config.json')
require('dotenv').config();

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

;(async () => {
    let wallet
    let amount
    try {
        let walletsStr = String(await readFile('./wallets.txt'))
        if (walletsStr == "") throw new Error('Wallets.txt is empty')
        let walletsArr = walletsStr.split('\n')
        if (config.random) walletsArr = randomArr(walletsArr)

        const poolFactory = await getContract(process.env.POOL_FACTORY_ADDRESS, "ClassicPoolFactory")
        const poolAddress = await poolFactory.functions.getPool(process.env.WETH_ADDRESS, process.env.USDC_ADDRESS)
        if (poolAddress[0] === ZERO_ADDRESS) {
            throw Error('Pool not exists');
        }

        for (const privateKey of walletsArr) {
            if (!ethers.utils.isHexString("0x" + privateKey, 32)) {
                console.log(privateKey, " invalid wallet")
                continue
            }
            wallet = new ethers.Wallet(privateKey)
            amount = getRandomInt(config.amountRangeMin, config.amountRangeMax, "wei")
            const timeout = getRandomInt(config.timeoutRangeMSMin, config.timeoutRangeMSMax)


            const swapData = ethers.utils.defaultAbiCoder.encode(
                ["address", "address", "uint8"],
                [process.env.WETH_ADDRESS, wallet.address, 1],
            )
            const steps = [{
                pool: poolAddress[0],
                data: swapData,
                callback: ZERO_ADDRESS,
                callbackData: '0x',
            }]

            const paths = [{
                steps: steps,
                tokenIn: ZERO_ADDRESS,
                amountIn: amount,
            }]
            const router = await getContract(process.env.ROUTER_ADDRESS, "SyncSwapRouter", wallet.connect(provider))
            setTimeout(async () => {
                const gasPrice = await provider.getGasPrice()
                const gas = await router.estimateGas.swap(paths, 0, ethers.BigNumber.from(Math.floor(Date.now() / 1000)).add(1800), { value: amount })
                const tx = await router.functions.swap(paths, 0, ethers.BigNumber.from(Math.floor(Date.now() / 1000)).add(1800), { value: amount, gas, gasPrice })
                console.log(
                    {
                        wallet: wallet.address,
                        pair: "ETH-USDC",
                        amount: amount,
                        txHash: tx.transactionHash
                    }
                )
            }, timeout)
        }
    } catch (error) {
        console.log(
            {
                wallet: wallet.address,
                pair: "ETH-USDC",
                amount: amount,
                err: error.message
            }
        )
    }
    process.exit()
})()
