const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');
const mnemonic = fs.readFileSync(".secret").toString().trim();

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
  //
    compilers: {
        solc: {
            version: "0.6.2",
                // Can also be set to "native" to use a native solc
            docker: false, // Use a version obtained through docker
            parser: "solcjs", // Leverages solc-js purely for speedy parsing
        }
    },
    networks: {
        ganache:{
            host:"127.0.0.1",
            port:7545,
            network_id:"5777"
        },
        develop: {
            port: 8545,
            network_id: 20,
            accounts: 10,
            defaultEtherBalance: 500
        },
        testnetb: {
            provider: () => new HDWalletProvider(mnemonic, `https://data-seed-prebsc-2-s3.binance.org:8545/`, 0),
            network_id: 97,
            confirmations: 10,
            timeoutBlocks: 200,
            accounts: 10,
            skipDryRun: true
        },
        bsc: {
            provider: () => new HDWalletProvider(mnemonic, `https://bsc-dataseed1.binance.org`),
            network_id: 56,
            confirmations: 10,
            timeoutBlocks: 200,
            skipDryRun: true
        },
    }
};
