const Web3 = require('web3')
const ContractKit = require('@celo/contractkit')
//const web3 = new Web3('https://alfajores-forno.celo-testnet.org')
const web3 = new Web3('https://forno.celo.org')
const kit = ContractKit.newKitFromWeb3(web3)
const getAccount = require('./getAccount').getAccount

async function awaitWrapper(){
    let account = await getAccount()
    console.log(`Root account is ${account.address}`)
    kit.connection.addAccount(account.privateKey)
}
awaitWrapper();

//const mnemonic = fs.readFileSync(".secret_mainnet").toString().trim();
module.exports = {

    plugins: [
      'truffle-contract-size'
    ],
    compilers: {
        solc: {
            version: "0.6.12",
                // Can also be set to "native" to use a native solc
            docker: false, // Use a version obtained through docker
            parser: "solcjs", // Leverages solc-js purely for speedy parsing
            settings:{
                optimizer: { enabled: true, runs: 1 }
            }
        }
    },
    networks: {
        ganache:{
            host:"127.0.0.1",
            port:7545,
            network_id:"5777",
            gas: 9721975000
        },
        develop: {
            port: 8545,
            network_id: 20,
            accounts: 10,
            defaultEtherBalance: 500
        },
        alfajores: {
            provider: kit.connection.web3.currentProvider, // CeloProvider
            network_id: 44787                              // Alfajores network id
        },
        celo: {
            provider: kit.connection.web3.currentProvider, // CeloProvider
            network_id: 42220
        }
    }
};
