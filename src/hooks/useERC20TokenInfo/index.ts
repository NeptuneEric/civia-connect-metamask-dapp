import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { readContracts } from '@wagmi/core';
import TestToken from '../../../abi/TestToken.json';

export const useERC20TokenInfo = (testTokenAddress: `0x${string}`) => {
    

    const key = `@"${testTokenAddress}","tokenInfo"`;
    const { data, error } = useSWR(key, async () => {
        if(testTokenAddress){
            console.log(['token address', testTokenAddress]);
            const res = await readContracts({
                contracts: [
                    {
                        address: testTokenAddress,
                        abi: TestToken.abi as unknown as any,
                        functionName: 'name'
                    },
                    {
                        address: testTokenAddress,
                        abi: TestToken.abi,
                        functionName: 'symbol'
                    }
                ]}).then(([{ result: tokenName }, { result: tokenSymbol }]) => {
                return {
                    tokenName,
                    tokenSymbol,
                    formatAddr: `${testTokenAddress.slice(0, 6)}...${testTokenAddress.slice(-4)}`
                };
              }).catch(() => {
                return null;
              });
            return res;
        }else{
            return null;
        }
    }, { revalidateIfStale: true })

    
    // const [data, setData] = useState<any>();
    // useEffect(() => {
    //     readContracts({
    //     contracts: [
    //         {
    //             address: testTokenAddress,
    //             abi: TestToken.abi as unknown as any,
    //             functionName: 'name'
    //         },
    //         {
    //             address: testTokenAddress,
    //             abi: TestToken.abi,
    //             functionName: 'symbol'
    //         }
    //     ]}).then(([{ result: tokenName }, { result: tokenSymbol }]) => {
    //         const data = {
    //             tokenName,
    //             tokenSymbol
    //         };
    //         setData(data);
    //     }).catch(() => {
    //         return null;
    //     });
    // }, [testTokenAddress]);

    return data || {
        tokenName: null,
        tokenSymbol: null,
        formatAddr: null
    };
};