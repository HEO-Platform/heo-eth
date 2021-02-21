# This is a Truffle project with EVM smart contracts for HEO
See details of HEO platform here: https://heo.finance
* Read the [white paper](https://6b6f9e9b-82c5-494d-bfc4-df820f1e7016.filesusr.com/ugd/cee28b_34d1cc737f6d49b7a6c90d7126299e56.pdf)
* Read the [Lite paper](https://6b6f9e9b-82c5-494d-bfc4-df820f1e7016.filesusr.com/ugd/cee28b_246f03b964714eb0bb231d564efd4676.pdf) (one-pager version of the White Paper)
* Read explanation of [Token Economics](https://6b6f9e9b-82c5-494d-bfc4-df820f1e7016.filesusr.com/ugd/cee28b_3d9e793ef4f14b8bb18f0dac58c7ffa9.pdf)

# Migrations
6th migration is for testing, so don't deploy it on a mainnet

# Working with Ganache and BSC testnet
Add .secret file to root folder of the project with a mnemonic to run migrations with truffle and to use truffle console.

# Build scripts
This script generates files for the [web app](https://github.com/grishick/heo-web)

`truffle exec buildForWeb.js --network ganache`
