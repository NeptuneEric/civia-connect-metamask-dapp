import { Abi, Contract, ProviderInterface, Call, shortString, number, defaultProvider } from 'starknet';
import { zipWith } from 'lodash-es';
import SBTMgrCompiledContractAbi from '../../abi/SBTMgr.json';
const { decodeShortString } = shortString;
import axios from 'axios';
import { ethers } from 'ethers';

const sbtConstractAddress = '0x056041215dda8462b041678717612fd64f99310aaa834a9d42527aeba5f3c661';

export const getFollowingList = async (address: string) => {
    const contract = new Contract(SBTMgrCompiledContractAbi, sbtConstractAddress, defaultProvider);
    const res = await contract.call('get_all_follows', [address]);
    console.log(res);
    const addressList = res.addrs.map((item: any) => (number.toHex(item)));
    const idList = res.ids.map((item: any) => (item.toNumber()));
    const nickNameList = res.nick_names.map((item: any) => (decodeShortString(item.toString())));
    const resData = zipWith(addressList, idList, nickNameList, (a, b, c) => {
        return {
            address: a,
            id: b,
            nickName: c,
            metamaskAddressList: []
        };
    });
    return resData;
}

export const getSessionToken = async (account: string) => {
    const key = `${account},token`;
    const token = window.localStorage.getItem(key);

    if (token) {
        return token;
    } else {
        const res = await axios.post('http://101.132.135.175:5000/getSessionToken', { account });
        window.localStorage.setItem(key, res.headers['session-token'] || '');
        return res;
    }
};

export const getMetamaskAddressList = async (account: string, civiaAddressList: string[]) => {

    const key = `${account},token`;
    const response = await axios.post('http://101.132.135.175:5000/app/getMockBindedAddrs',
        {
            civia_addresses: civiaAddressList
        },
        {
            headers: {
                authorization: `Bearer ${window.localStorage.getItem(key) || ''}`,
                'Content-type': 'application/json;charset=utf-8'
            }
        });
    return Promise.resolve(response.data);
};

export const getSynthesizeAddressList = async (account: string) => {
    const civiaAddressList = await getFollowingList(account).catch((err) => {});
    const getTokenRes = await getSessionToken(account).catch((err) => {});
    const metamaskAddressList = await getMetamaskAddressList(account, (civiaAddressList as any[]).map((item) => item.address)).then(({ code, result }) => {
        if(code === 0){
            return result.addressInfos;
        }else{
            return new Array(civiaAddressList!.length);
        }
    }).catch((err) => {});
    console.log(metamaskAddressList);
    const syntheAddressList = zipWith(civiaAddressList as any[], metamaskAddressList, (a, b: any) => {
        return {
            ...a,
            metamaskAddressList: b.metamast_addresses
        };
    });
    return syntheAddressList;
}
