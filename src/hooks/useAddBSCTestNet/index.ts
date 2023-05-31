import { FC, useEffect, useState } from 'react';
import { getNetwork } from '@wagmi/core';

import { customBscTestnet } from '../../lib/bscTestNetConfig';

const DefaultBSCTestChainConfig = {
    chainId: '0x' + (customBscTestnet.id).toString(16),
    chainName: customBscTestnet.name,
    nativeCurrency: customBscTestnet.nativeCurrency,
    rpcUrls: [customBscTestnet.rpcUrls.public.http ?? customBscTestnet.rpcUrls.default.http].flat(),
    blockExplorerUrls: [customBscTestnet.blockExplorers.default.url || customBscTestnet.blockExplorers.etherscan.url]
};

export const useAddBSCTestNet: FC<any> = ({ BSCTestChainConfig = DefaultBSCTestChainConfig }) => {
    useEffect(() => {
        (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
                BSCTestChainConfig
            ]
        });
    }, [BSCTestChainConfig]);

    return null;
};

export const useAddBSCTestNetAndSwitch: any = () => {
    const [chainId, setChainId] = useState<undefined | number>();
    const switchBscTestNet = () => {
        (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
                DefaultBSCTestChainConfig
            ]
        });
    };
    useEffect(() => {
        const { chain, chains } = getNetwork();
        chain && setChainId(chain.id);
        if (chain && chain.id !== customBscTestnet.id) {
            switchBscTestNet();
        }
    }, []);

    return [chainId, switchBscTestNet];
};
