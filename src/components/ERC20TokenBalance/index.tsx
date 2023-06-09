import { FC, useEffect } from 'react';
import { ethers } from 'ethers';
import { readContracts } from '@wagmi/core';
import useSWR from 'swr';
import TestToken from '../../../abi/TestToken.json';
import { useERC20TokenInfo } from '../../hooks/useERC20TokenInfo';

export const ERC20TokenBalance: FC<any> = ({ tokenAddress, tokenIds, userAddress, children }) => {
    const newTokenIds: number[] = Array.from(new Set(tokenIds));
    // const { tokenName, tokenSymbol, decimals = 1, formatAddr } = useERC20TokenInfo(tokenAddress);
    //
    const key = `${userAddress}-${tokenAddress}-balance`;
    const { data } = useSWR(key, async () => {
        if (tokenAddress && userAddress) {
            const contracts = newTokenIds.map((tokenId: number) => ({
                address: tokenAddress,
                abi: TestToken.abi,
                functionName: 'balanceOf',
                args: [userAddress, tokenId]
            })) as any;
            return await readContracts({ contracts }).then((res: any) => {
                console.log(res);
                const totalRes = res.reduce((total: BigInt, cur: { result: BigInt }) => {
                    // @ts-ignore
                    return total + cur.result;
                }, 0n);
                return totalRes.toString();
            }).catch((err) => {
                console.log(err);
            });
        } else {
            return undefined;
        }
    }, { revalidateIfStale: true });

    return children && children(String(data));
};
