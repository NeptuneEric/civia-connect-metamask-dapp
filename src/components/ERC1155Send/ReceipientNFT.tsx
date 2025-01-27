import { FC, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Form, Input } from 'antd';
import { InputTags } from '../../components/InputTags';
import { ERC1155TokenInfo } from '../../components/ERC1155TokenInfo';
import CiviaERC1155Check from '../../../abi/CiviaERC1155Check.json';
import { multicall } from '@wagmi/core';
import { localStorageProvider } from '../../lib/localStorageProvider';
import { ethers } from 'ethers';
import { useSignMessage } from 'wagmi';

const CIVIA_ERC20_CONTRACT_ADDRESS = '0xFB85425B4b9bd96AFAC83bb1f756B8A1b8B6A3Ae';
const localStorageProviderMap = localStorageProvider();

export const ReceipientNFT: FC<any> = forwardRef(({
    selectedToken,
    form,
    messageApi,
    setIsLoading,
    metamaskAddress,
    setStep,
    visible
}, ref) => {
    const [signDataList, setSignDataList] = useState<any[]>([]);
    const [userCurrentIds, setUserCurrentIds] = useState<any[]>([]);
    const { signMessage: metaMaskSignMessage } = useSignMessage({
        onSuccess: (signData: any) => {
            const sigHex = signData.substring(2);
            const r = '0x' + sigHex.slice(0, 64);
            const s = '0x' + sigHex.slice(64, 128);
            const v = parseInt(sigHex.slice(128, 130), 16);
            setSignDataList(pre => [...pre, { r, s, v }]);
        },
        onError: () => {
            setSignDataList(pre => [...pre, null]);
        }
    });

    useEffect(() => {
        setSignDataList([]);
    }, []);
    //
    useEffect(() => {
        if (userCurrentIds.length && userCurrentIds.length === signDataList.length) {
            setStep(3);
        }
    }, [signDataList, userCurrentIds, setStep]);
    //
    const writeCheck = async () => {
        //
        const { selectToken, inputAmountNft, inputIdNft: inputIdsStr, selectFriendNft } = form.getFieldsValue();
        if (!inputAmountNft || !/^[1-9]\d*$/.test(inputAmountNft)) {
            return messageApi.open({
                type: 'error',
                content: 'Please specify token amount'
            });
        }
        if (!inputIdsStr || !/^[1-9]((,\d+)|\d*)*$/.test(inputIdsStr)) {
            return messageApi.open({
                type: 'error',
                content: 'Please specify token id'
            });
        }
        if (!selectFriendNft || selectFriendNft.length < 1) {
            return messageApi.open({
                type: 'error',
                content: 'Please input receipients(s)'
            });
        }
        setIsLoading(true);
        //
        const inputIds = inputIdsStr.split(',');
        const contracts = inputIds.map((item: string) => ({
            address: CIVIA_ERC20_CONTRACT_ADDRESS,
            abi: CiviaERC1155Check.abi as any,
            functionName: 'getLastCheckId',
            args: [selectFriendNft[0], selectToken, item]
        }));
        setIsLoading(false);
        //
        const res: any = await multicall({ contracts });

        // key: id value: lastId
        const mapedRes = inputIds.reduce((pre: any, item: string, index: number) => {
            const localLastCheckId = Number(localStorageProviderMap.get(`@${selectToken}.${item}.${selectFriendNft[0]},lastCheckId`) || 0);
            const lastCheckId = Number(res[index].result);
            const computedLastCheckId = Math.max(localLastCheckId, lastCheckId);
            localStorageProviderMap.set(`@${selectToken}.${item}.${selectFriendNft[0]},lastCheckId`, computedLastCheckId);
            return {
                ...pre,
                [item]: computedLastCheckId
            };
        }, {});

        console.log(mapedRes);
        if (res && mapedRes) {
            const userCurrentIds = Object.keys(mapedRes).map((item: any) => (
                {
                    inputId: item,
                    currentId: mapedRes[item],
                    user: selectFriendNft[0]
                }
            ));
            setUserCurrentIds(userCurrentIds);
            //
            inputIds.forEach((inputId:any, index: number) => {
                const orderParts = [
                    { value: selectToken, type: 'address' },
                    { value: metamaskAddress, type: 'address' },
                    { value: userCurrentIds[index].user, type: 'address' },
                    { value: inputId, type: 'uint256' },
                    { value: userCurrentIds[index].currentId + 1, type: 'uint256' },
                    { value: userCurrentIds[index].currentId + 1, type: 'uint256' },
                    { value: inputAmountNft.toString(), type: 'uint256' }
                ];
                const types = orderParts.map(o => o.type);
                const values = orderParts.map(o => o.value);
                const hash = ethers.utils.solidityKeccak256(types, values);
                metaMaskSignMessage({ message: ethers.utils.arrayify(hash) as any });
            });
        } else {
            messageApi.open({
                type: 'error',
                content: res.msg
            });
            return null;
        }
    };
    //
    const sendSignData = async () => {
        let hasError = false;
        const { selectToken, inputAmountNft, inputIdNft: inputIdsStr } = form.getFieldsValue();
        const inputIds = inputIdsStr.split(',');
        for (let index = 0; index < inputIds.length; index++) {
            //
            const { currentId, user } = userCurrentIds[index];
            const signData = signDataList[index];
            if (!signData) {
                return;
            }
            const tokenInfo = localStorageProviderMap.get(`@"${selectToken}","tokenInfo"`);
            const message = {
                tokenAddr: selectToken,
                issuerAddr: metamaskAddress!,
                receiverAddr: user,
                tokenId: inputIds[index],
                beginId: currentId + 1,
                endId: currentId + 1,
                amt: inputAmountNft.toString(),
                sig: {
                    r: signData.r,
                    s: signData.s,
                    v: signData.v
                }
            };

            const options = {
                suggestedName: `${tokenInfo?.data?.tokenName || selectToken}_${inputIds[index]}_${user}_${message.beginId}_${message.endId}.json`,
                types: [
                    {
                        description: 'Test files',
                        accept: {
                            'text/plain': ['.json']
                        }
                    }
                ]
            };
            try {
                const handle = await (window as any).showSaveFilePicker(options);
                const writable = await handle.createWritable();

                await writable.write(JSON.stringify(message));
                await writable.close();
                const localCheckId = localStorageProviderMap.get(`@${selectToken}.${inputIds[index]}.${user},lastCheckId`) || 0;
                localStorageProviderMap.set(`@${selectToken}.${inputIds[index]}.${user},lastCheckId`, localCheckId + 1);
            } catch (err) {
                console.log(err);
                hasError = true;
            }
        }
        setIsLoading(false);
        !hasError && setStep(5);
    };
    //
    useImperativeHandle(ref, () => {
        return {
            writeCheck,
            sendSignData,
            getFieldValues: () => {
                return {
                    userCurrentIds,
                    signDataList
                };
            }
        };
    });

    console.log(signDataList);
    //
    return (
        <div style={{ display: visible ? 'inherit' : 'none' }}>
            <Form.Item
                label={
                    <div>Token Id</div>
                }
                name="inputIdNft"
            >
                <Input />
            </Form.Item>
            <Form.Item
                label={
                    <div>
                        Token amount
                        {
                            selectedToken && (
                                <ERC1155TokenInfo tokenAddress={selectedToken}>
                                    {
                                        (tokeName: string, tokenSymbol: string, formatAddr: string) => {
                                            return ` (${tokenSymbol})`;
                                        }
                                    }
                                </ERC1155TokenInfo>
                            )
                        }
                    </div>
                }
                name="inputAmountNft"
                initialValue={1}
            >
                <Input readOnly />
            </Form.Item>
            <Form.Item
                label="Receipient(s)"
                name="selectFriendNft"
            >
                <InputTags onChange={(value: string[]) => { console.log(value); }} single={true} />
            </Form.Item>
        </div>
    );
});
