import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

require('dotenv').config();

const GOERLI_URI = process.env.GOERLI_URI;
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const API_KEY = process.env.ETHERSCAN_API_KEY || '';

const config: HardhatUserConfig = {
  solidity: '0.8.9',
  networks: {
    goerli: {
      url: GOERLI_URI,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      goerli: API_KEY,
    },
  },
};

export default config;
