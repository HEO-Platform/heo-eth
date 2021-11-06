const HDWalletProvider = require('truffle-hdwallet-provider');
const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker')
const Web3 = require('web3');
const web3 = new Web3();

const fs = require('fs');
const MNEMONIC = fs.readFileSync(".secret_testnet").toString().trim();
//const MNEMONIC = fs.readFileSync(".secret_mainnet").toString().trim();
//const ROOT_ACOUNT = "0x02C364e8048C60c980d4C1abb9918f66D716d603";
const ROOT_ACOUNT = "0x403E550f5E4702BE7e0e80E57fd5F35395322658";
const startIndex = 0;
const numberOfAccounts = 3;

//const ROOT_ACOUNT = "0x403e550f5e4702be7e0e80e57fd5f35395322658";
let hdWalletProvider;
const setupWallet = (
    url
) => {
    if (!hdWalletProvider) {
        hdWalletProvider = new HDWalletProvider(
            MNEMONIC,
            url,
            startIndex,
            numberOfAccounts,
            true,
        )
        hdWalletProvider.engine.addProvider(new NonceTrackerSubprovider())
    }
    return hdWalletProvider
};

module.exports = {
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  //networks: {
  //  development: {
  //    host: "127.0.0.1",
  //    port: 7545,
  //    network_id: "*"
  //  },
  //  test: {
  //    host: "127.0.0.1",
  //    port: 7545,
  //    network_id: "*"
  //  }
  //}
    plugins: [
      'truffle-contract-size'
    ],
    compilers: {
        solc: {
            version: "0.8.0",
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
        bsctestnet: {
            provider: () => new HDWalletProvider(mnemonic, `https://data-seed-prebsc-1-s1.binance.org:8545`, 0, 3),
            network_id: 97,
            confirmations: 5,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        bscdev: {
            provider: () => new HDWalletProvider(MNEMONIC, `https://data-seed-prebsc-1-s1.binance.org:8545`, 0, 3),
            network_id: 97,
            confirmations: 5,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        bsc: {
            provider: () => new HDWalletProvider(MNEMONIC, `https://bsc-dataseed1.binance.org`, 0, 3),
            network_id: 56,
            confirmations: 5,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        rinkeby:{
            provider: () => new HDWalletProvider(MNEMONIC, 'https://rinkeby.infura.io/v3/56dea47710364cc1aa0163e29adfdd24', 0, 3),
            network_id: 4,
            confirmations: 5,
            timeoutBlocks: 200,
            skipDryRun: true
        },
        auroratest: {
            provider: () => setupWallet('https://testnet.aurora.dev'),
            network_id: 0x4e454153,
            gas: 10000000,
            from: ROOT_ACOUNT // CHANGE THIS ADDRESS
        },
        ethereum: {
            provider: () => new HDWalletProvider(MNEMONIC, `https://mainnet.infura.io/v3/56dea47710364cc1aa0163e29adfdd24`, 0, 3),
            network_id: 1,
            confirmations: 10,
            skipDryRun: false,
            gas: 5400000
        },
        goerli:{
            provider: () => new HDWalletProvider(MNEMONIC, 'https://goerli.infura.io/v3/56dea47710364cc1aa0163e29adfdd24', 0, 3),
            network_id: 5,
            confirmations: 5,
            timeoutBlocks: 200,
            skipDryRun: true
        }
    }
};
