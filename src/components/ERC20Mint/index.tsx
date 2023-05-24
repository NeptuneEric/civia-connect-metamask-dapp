import { FC, useEffect, useState, useRef } from 'react';
import { Spin, Button, List, message, Steps, Space, Card, Empty, Checkbox } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useContractRead, useContractWrite, useConnect, useAccount, useSignMessage } from 'wagmi';
import { getContract, getWalletClient, readContract, writeContract } from '@wagmi/core'
import { ethers } from "ethers";
import { userMintERC20Done } from '../../services/account.service';

import { ERC20TokenInfo } from '../ERC20TokenInfo';

import CiviaERC20Check from '../../../abi/CiviaERC20Check.json';
import TestToken from '../../../abi/TestToken.json';

import { getErc20Message, getSessionToken } from '../../services/account.service';

const CIVIA_ERC20_CONTRACT_ADDRESS = '0x7fd4c5dE475801D4691Bd325Bf5937b430c516E4';

import styles from './index.module.css';
import { CheckboxChangeEvent, CheckboxChangeEventTarget } from 'antd/es/checkbox/Checkbox';


const TokenItem: FC<any> = ({ item, onSigned }) => {
    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = locationSearch.get('civiaAddress') as string;
    const [isLoaing, setIsLoading] = useState(false);
    const [step, setStep] = useState<0|1|-1>(0);
    const { data: signData, signMessage: metaMaskSignMessage } = useSignMessage({
        onSuccess: (res) => {
            setStep(1);
            onSigned({ signData: res });
        }
    });
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();
    const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
    const connectMetamaskRef = useRef(false);
    const [messageApi, contextHolder] = message.useMessage();

    // auto connect metamask
    if(!connectMetamaskRef.current && !metamaskAddress && metaMaskConnectors && metaMaskConnectors.length){
        connectMetamaskRef.current = true;
        metaMaskConnect({ connector: metaMaskConnectors[0] });
    }

    //
    const handleSignData = async () => {
        const { receiver, token, id_begin: idBegin, id_end: idEnd, amount } = item.content;
        const orderParts = [
            { value: metamaskAddress, type: 'address' },
            { value: receiver, type: 'address' },
            { value: token, type: "address" },
            { value: idBegin, type: "uint256" },
            { value: idEnd, type: "uint256" },
            { value: `${amount * 1e18}`, type: "uint256" },
        ];

        const types = orderParts.map(o => o.type);
        const values = orderParts.map(o => o.value);
        const hash = ethers.utils.solidityKeccak256(types, values);
        metaMaskSignMessage({ message: ethers.utils.arrayify(hash) as any });
    }
    //
    const handleMint = async () => {
        const { receiver, token, id_begin: idBegin, id_end: idEnd, amount, sign } = item.content;
        const signObj = JSON.parse(sign);
        if(signData){
            const sigHex = signData.substring(2);
            const receiverR = '0x' + sigHex.slice(0, 64);
            const receiverS = '0x' + sigHex.slice(64, 128);
            const receiverV = parseInt(sigHex.slice(128, 130), 16);
            //
            const addrs = [token],
            users = [receiver],
            beginIds = [idBegin],
            endIds = [idEnd],
            amounts = [`${amount * 1e18}`],
            v = [signObj.v, receiverV],
            r_s = [signObj.r, signObj.s, receiverR, receiverS];
            //
            setIsLoading(true);
            const res = await writeContract({
                address: CIVIA_ERC20_CONTRACT_ADDRESS,
                abi: CiviaERC20Check.abi,
                functionName: 'batchMint',
                args: [addrs, users, beginIds, endIds, amounts, v, r_s]
            }).then(() => {
                setStep(-1);
                return userMintERC20Done(searchCiviaWalletAddress, [item.message_id]);
            }).catch((err) => {
                const errStr = String(err);
                const IsStartIdNotMatch = /start id not match/.test(errStr);
                console.log(err);
                messageApi.open({
                    type: 'error',
                    content: IsStartIdNotMatch ? 'start id not match' : errStr
                });
                IsStartIdNotMatch && userMintERC20Done(searchCiviaWalletAddress, [item.message_id]);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }


    return (
        <>
            {contextHolder}
            <List.Item
                extra={<div>
                    {
                        step === 0? (<Button size='small' onClick={handleSignData}>Sign</Button>) : (<CheckCircleOutlined className={styles.successIcon} />)
                    }
                </div>}
            >
                <div><label className={styles.label} />{ item.content.amount }</div>
            </List.Item>
        </>
    );
};

//
const ERC20Mint: FC<any> = () => {
    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = locationSearch.get('civiaAddress') as string;
    const searchERC20Token = locationSearch.get('erc20token') as string;
    const [currentERC20Token, setCurrentERC20Token] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messageList, setMessageList] = useState<Map<string, any[]>>(new Map());

    const [messageApi, contextHolder] = message.useMessage();
    const [selectedTokensAndSign, setSelectedTokensAndSign] = useState<Map<string, any>>(new Map());

    const filterMessageList = Array.from(messageList.values());// currentERC20Token?  messageList.filter((item) => item[0].content.token === currentERC20Token) : messageList;

    const checkedMessageList = filterMessageList.filter((item) => {
        return item.every((su: any) => su.customContent);
    });
    console.log(checkedMessageList);

    useEffect(() => {
        getErc20Message(searchCiviaWalletAddress).then((res) => {
            const newMessageMapList = res.reduce((newML: Map<string, any>, item: any, index: number) => {
                const content = JSON.parse(item.content);
                const token = content.token;
                const newMLItem = newML.get(token) || [];
                newMLItem.push({
                    ...item,
                    content
                });
                newML.set(token, newMLItem.sort((a: any, b: any) => {
                    return a.content.id_begin > b.content.id_begin ? 1: -1;
                }));
                return newML;
            }, new Map());
            setMessageList(newMessageMapList);
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    const handleSelectAll = (evt: CheckboxChangeEvent) => {
        console.log(evt);
        const { value, checked } = evt.target;
        // if(checked){
        //     selectedTokens.set(value, true);
        // }else{
        //     selectedTokens.delete(value);
        // }
        // setSelectedTokens(selectedTokens);
    }

    const handleSignedCreater = (tokenAddress: string, itemIndex: number) => {
        return (signedInfo: {signData: string, [k:string]: any}) => {
            const newMessageList = new Map(messageList);
            const subItems = newMessageList.get(tokenAddress);
            subItems![itemIndex].customContent = {
                ...(subItems![itemIndex].customContent || {}),
                signData: signedInfo.signData
            };
            newMessageList.set(tokenAddress, subItems!);
            setMessageList(newMessageList);
        }
    }

    const handleBatchMint = async () => {
        console.log(checkedMessageList);
        const getOneContractArgs = (item: any) => {
            const { receiver, token, id_begin: idBegin, id_end: idEnd, amount, sign } = item.content;
            const signObj = JSON.parse(sign);
            const sigHex = item.customContent.signData.substring(2);
            const receiverR = '0x' + sigHex.slice(0, 64);
            const receiverS = '0x' + sigHex.slice(64, 128);
            const receiverV = parseInt(sigHex.slice(128, 130), 16);
            //
            const addrs = [token],
            users = [receiver],
            beginIds = [idBegin],
            endIds = [idEnd],
            amounts = [`${amount * 1e18}`],
            v = [signObj.v, receiverV],
            r_s = [signObj.r, signObj.s, receiverR, receiverS];

            return [addrs, users, beginIds, endIds, amounts, v, r_s];
        };

        const mergedContractArgs = checkedMessageList.flat().reduce(([preAddrs, preUsers, preUeginIds, preEndIds, preAmounts, preV, preR_s], subItem: any) => {
            const [addrs, users, beginIds, endIds, amounts, v, r_s] = getOneContractArgs(subItem);
            return [preAddrs.concat(addrs), preUsers.concat(users), preUeginIds.concat(beginIds), preEndIds.concat(endIds), preAmounts.concat(amounts), preV.concat(v), preR_s.concat(r_s)];
        }, [[], [], [], [], [], [], []]);

        console.log(mergedContractArgs);

        setIsLoading(true);
        const res = await writeContract({
            address: CIVIA_ERC20_CONTRACT_ADDRESS,
            abi: CiviaERC20Check.abi,
            functionName: 'batchMint',
            args: mergedContractArgs
        }).then(() => {
            checkedMessageList.flat().forEach(({ message_id }) => {
                userMintERC20Done(searchCiviaWalletAddress, [message_id]);
            });
            return true;
        }).catch((err) => {
            const errStr = String(err);
            const IsStartIdNotMatch = /start id not match/.test(errStr);
            console.log(err);
            messageApi.open({
                type: 'error',
                content: IsStartIdNotMatch ? 'start id not match' : errStr
            });
        }).finally(() => {
            setIsLoading(false);
        });
            
    }


    return (
        <>
        <Spin spinning={isLoading}>
            {contextHolder}
                <div className={styles.body}>
                    <List style={{ visibility: filterMessageList.length? 'initial': 'hidden'}}>
                        {
                        filterMessageList.map((item: any, index: number) => {
                            return (
                                <div key={index}>
                                    <Card title={
                                            <ERC20TokenInfo tokenAddress={item[0].content.token}>
                                                {
                                                    (tokeName: string, tokenSymbol: string, formatAddr: string) => {
                                                        return <div><label className={styles.label}>Token:</label>{`${tokeName} (${tokenSymbol}) ${formatAddr}`}</div>;
                                                    }
                                                }
                                            </ERC20TokenInfo>
                                        }
                                        extra={
                                            <Checkbox onChange={handleSelectAll} checked={item.every((su: any) => su.customContent)}>Select all</Checkbox>
                                        }
                                    >
                                        <List.Item><label className={styles.label}>Amount:</label></List.Item>
                                        {
                                            item.map((subItem: any, subIndex: number) => {
                                                return (
                                                    <>
                                                        <TokenItem item={subItem} key={subIndex} onSigned={handleSignedCreater(subItem.content.token, subIndex)} />
                                                    </>
                                                );
                                            })
                                        }
                                    </Card>
                                    <br/>
                                </div>
                            );
                        }) 
                        }
                    </List>
                    {
                        filterMessageList.length === 0? <Empty />: null
                    }
                </div>
                {
                    checkedMessageList.length? (
                        <div className={styles.floatFooter}>
                            <div>
                                <div className={styles.shopCard}>
                                    <List>
                                        {
                                            checkedMessageList.map((item: any, index: number) => {
                                                return <List.Item key={index}>
                                                    <ERC20TokenInfo tokenAddress={item[0].content.token}>
                                                        {
                                                            (tokeName: string, tokenSymbol: string, formatAddr: string) => {
                                                                return <div><label className={styles.label}>Token:</label>{`${tokeName} (${tokenSymbol}) ${formatAddr}`}</div>;
                                                            }
                                                        }
                                                    </ERC20TokenInfo>
                                                </List.Item>
                                            })
                                        }
                                        <List.Item>
                                            <div className={styles.batchButton}>
                                                <Space>
                                                    <Button type='primary' onClick={handleBatchMint}>Batch mint</Button>
                                                </Space>
                                            </div>
                                        </List.Item>
                                    </List>
                                </div>
                            </div>
                        </div>
                    ): null
                }
            </Spin>
        </>
    );
};

export default ERC20Mint;