# This is a Truffle project with EVM smart contracts for HEO
See details of HEO platform here: https://heo.finance
* Read the [white paper](https://6b6f9e9b-82c5-494d-bfc4-df820f1e7016.filesusr.com/ugd/cee28b_34d1cc737f6d49b7a6c90d7126299e56.pdf)
* Read the [Lite paper](https://6b6f9e9b-82c5-494d-bfc4-df820f1e7016.filesusr.com/ugd/cee28b_246f03b964714eb0bb231d564efd4676.pdf) (one-pager version of the White Paper)
* Read explanation of [Token Economics](https://6b6f9e9b-82c5-494d-bfc4-df820f1e7016.filesusr.com/ugd/cee28b_3d9e793ef4f14b8bb18f0dac58c7ffa9.pdf)

# Install pre-requisites
Install Truffle https://www.trufflesuite.com/truffle

Install Ganache https://www.trufflesuite.com/ganache

# Working with Ganache and BSC testnet
Add .secret file to root folder of the project with a mnemonic to run migrations with truffle and to use truffle console.

## Running locally with Ganache
In order to run [heo-web application](https://github.com/grishick/heo-web) with local blockchain, you will need
to deploy contracts to local Ganache. You can do that using Truffle migrations. First, create a Ganache
workspace and point it to truffle-config.js file in this repo. Then, run migrations 1 through 6
```
truffle migrate -f 1 --to 6 --network ganache
```
the above command will deploy all HEO contracts to Ganache. The 6th migration will also deploy a contract
for manually distributing HEO tokens, which can be used to create some data to play with.
HEO platform needs a ERC20 stablecoin. "contracts" folder has `StableCoinForTests.sol` contract that can be used
as such stablecoin for testing. You can run `initDemoData.js` to deploy that stable coin and distribute some of it
to your local accounts on Ganache. Make sure to edit `initDemoData.js` and change tese lines to match
account addresses on your local Ganache.
```
await iTestCoin.transfer("0x748351f954Af3C95a41b88ba7563453Ab98eA085", web3.utils.toWei("10000"));
await iTestCoin.transfer("0x02C364e8048C60c980d4C1abb9918f66D716d603", web3.utils.toWei("10000"));
await iTestCoin.transfer("0x6CFe06BCC19444b90fe5f8729eb619c51Fcb7e3A", web3.utils.toWei("10000"));
```
```
truffle exec initDemoData.js --network ganache
```

# Build scripts
This script generates files for the [web app](https://github.com/grishick/heo-web)

`truffle exec buildForWeb.js --network ganache`

the output of this build script consists of several JS files that contain contract ABIs and deployed addresses. 
Some output files contain only ABIs, because they do not need to be deployed for the application.
This script puts these JS files into `build/web/`. In order to get modified contracts to the web application, 
you need to copy the `*.js` files from `build/web` to the heo-web application.

# Running tests
All tests are written in JavaScript and assume you have Truffle CLI installed. Read [Writing Tests in JavaScript on Truffle docs site](https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript).
To run the tests, launch Ganache Quickstart Ethereum, and use Truffle CLI, like so
```
truffle test --network ganache
```



