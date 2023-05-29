import { bscTestnet } from '@wagmi/core/chains';

export const customBscTestnet = {
    ...bscTestnet,
    rpcUrls: {
        default: {
            http: ['https://small-sleek-paper.bsc-testnet.discover.quiknode.pro/c7b1fd7438013a31684e3fc4ed6d3686d8848305']
        },
        public: {
            http: ['https://small-sleek-paper.bsc-testnet.discover.quiknode.pro/c7b1fd7438013a31684e3fc4ed6d3686d8848305']
        }
    }
};
