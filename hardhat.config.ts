import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const GOERLI_URI = process.env.GOERLI_URI;
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

const config: HardhatUserConfig = {
  solidity: '0.8.9',
  networks: {
    goerli: {
      url: GOERLI_URI,
      accounts: [PRIVATE_KEY],
    },
  },
};

export default config;
