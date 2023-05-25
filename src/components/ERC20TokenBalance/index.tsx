import { FC, useEffect } from 'react';
import { readContract } from '@wagmi/core';
import useSWR from 'swr';
import TestToken from '../../../abi/TestToken.json';

export const ERC20TokenBalance: FC<any> = ({ tokenAddress, userAddress, children }) => {
    const key = `${userAddress}-${tokenAddress}-balance`;
    const { data } = useSWR(key, async () => {
        if(tokenAddress && userAddress){
            return await readContract({
                address: tokenAddress,
                abi: TestToken.abi,
                functionName: 'balanceOf',
                args: [userAddress]
            }).catch((err) => {
                console.log(err);
            });
        }else{
            return undefined;
        }
    }, { revalidateIfStale: true })

    return children && children(String(data));
};