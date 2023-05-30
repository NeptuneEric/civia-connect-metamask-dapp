import { FC, useEffect, useState, useRef, ReactElement, useImperativeHandle, forwardRef } from 'react';
import { Spin, Button, List, message, Space, Card, Empty, notification } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useConnect, useAccount, useSignMessage } from 'wagmi';
import { writeContract } from '@wagmi/core';
import { ethers } from 'ethers';
import { userMintERC20Done, leaveMessagePackERC20 } from '../../services/account.service';

import { useAddBSCTestNet, useAddBSCTestNetAndSwitch } from '../../hooks/useAddBSCTestNet';
import { localStorageProvider } from '../../lib/localStorageProvider';

import { useGetERCMessageUnMint } from '../../hooks/useGetERCMessageUnMint';

import { ERC20TokenInfo } from '../ERC20TokenInfo';
import { ERC20TokenBalance } from '../ERC20TokenBalance';

import CiviaERC20Check from '../../../abi/CiviaERC20Check.json';

import styles from './index.module.css';

const CIVIA_ERC20_CONTRACT_ADDRESS = '0x8a647C33fe1fb520bDbcbA10d88d0397F5FdC056';

const localStorageProviderMap = localStorageProvider();

const TokenItem: FC<any> = ({ item, onSigned }) => {
    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = locationSearch.get('civiaAddress') as string;
    const [isLoaing, setIsLoading] = useState(false);
    const [step, setStep] = useState<0|1|-1>(0);
    const { data: signData, signMessage: metaMaskSignMessage } = useSignMessage({
        onSuccess: (res) => {
            setStep(1);
            onSigned({ signData: res });
            localStorageProviderMap.set(`signData@{searchCiviaWalletAddress}@messageId:${item.message_id}`, res);
        }
    });

    useEffect(() => {
        const localStorageSignData = localStorageProviderMap.get(`signData@{searchCiviaWalletAddress}@messageId:${item.message_id}`);
        if (localStorageSignData) {
            onSigned({ signData: localStorageSignData });
            setStep(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.message_id]);

    const [messageApi, contextHolder] = message.useMessage();
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();

    //
    const handleSignData = async () => {
        const { receiver, token, id_begin: idBegin, id_end: idEnd, amount } = item.content;
        const orderParts = [
            { value: metamaskAddress, type: 'address' },
            { value: receiver, type: 'address' },
            { value: token, type: 'address' },
            { value: idBegin, type: 'uint256' },
            { value: idEnd, type: 'uint256' },
            { value: ethers.utils.parseUnits(amount.toString(), 18).toString(), type: 'uint256' }
        ];

        const types = orderParts.map(o => o.type);
        const values = orderParts.map(o => o.value);
        const hash = ethers.utils.solidityKeccak256(types, values);
        metaMaskSignMessage({ message: ethers.utils.arrayify(hash) as any });
    };
    //
    const handleMint = async () => {
        const { receiver, token, id_begin: idBegin, id_end: idEnd, amount, sign } = item.content;
        const signObj = JSON.parse(sign);
        if (signData) {
            const sigHex = signData.substring(2);
            const receiverR = '0x' + sigHex.slice(0, 64);
            const receiverS = '0x' + sigHex.slice(64, 128);
            const receiverV = parseInt(sigHex.slice(128, 130), 16);
            //
            const addrs = [token];
            const users = [receiver];
            const beginIds = [idBegin];
            const endIds = [idEnd];
            const amounts = [ethers.utils.parseUnits(amount.toString(), 18).toString()];
            const v = [signObj.v, receiverV];
            const r_s = [signObj.r, signObj.s, receiverR, receiverS];
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
    };

    return (
        <>
            {contextHolder}
            <List.Item
                extra={<div>
                    {
                        step === 0 ? (<Button size='small' onClick={handleSignData}>Sign</Button>) : (<CheckOutlined className={styles.successIcon} />)
                    }
                </div>}
            >
                <div><label className={styles.label} />{item.content.amount}</div>
            </List.Item>
        </>
    );
};

const ERC20CheckList: FC<any> = forwardRef((props, ref) => {
    const [api, contextHolder] = notification.useNotification();

    useImperativeHandle(ref, () => (
        {
            openNotification,
            destroy: () => {
                api.destroy(1);
            }
        }
    ));

    const openNotification = (placement: ReactElement) => {
        api.info({
            icon: null,
            message: 'Check list',
            description: props.children,
            duration: null,
            closeIcon: null,
            key: 1,
            placement: 'bottomRight'
        });
    };

    return (
        <>
            {contextHolder}
        </>
    );
});

//
const ERC20Mint: FC<any> = () => {
    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = locationSearch.get('civiaAddress') as string;
    const searchERC20Token = locationSearch.get('erc20token') as string;
    const [isLoading, setIsLoading] = useState(true);
    const [messageList, setMessageList] = useState<Map<string, any[]>>(new Map());
    //
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();
    const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
    const connectMetamaskRef = useRef(false);

    const { chainId, switchBscTestNet } = useAddBSCTestNetAndSwitch();

    // auto connect metamask
    if (!connectMetamaskRef.current && !metamaskAddress && metaMaskConnectors && metaMaskConnectors.length) {
        connectMetamaskRef.current = true;
        metaMaskConnect({ connector: metaMaskConnectors[0] });
    }

    const [messageApi, contextHolder] = message.useMessage();

    const checkListRef = useRef();

    const filterMessageList = Array.from(messageList.values());

    const checkedMessageList = filterMessageList.filter((item) => {
        return item.every((su: any) => su.customContent);
    });

    const { data: unMintMessageData } = useGetERCMessageUnMint(searchCiviaWalletAddress);

    useEffect(() => {
        if (unMintMessageData && unMintMessageData.length) {
            const newMessageMapList = unMintMessageData.reduce((newML: Map<string, any>, item: any, index: number) => {
                const content = JSON.parse(item.content);
                const token = content.token;
                const newMLItem = newML.get(token) || [];
                newMLItem.push({
                    ...item,
                    content
                });
                newML.set(token, newMLItem.sort((a: any, b: any) => {
                    return a.content.id_begin > b.content.id_begin ? 1 : -1;
                }));
                return newML;
            }, new Map());
            setMessageList(newMessageMapList);
            setIsLoading(false);
        }
    }, [unMintMessageData]);

    useEffect(() => {
        if (checkedMessageList.length) {
            setTimeout((checkListRef.current as any).openNotification, 300);
        }
    }, [checkedMessageList.length]);

    const handlePackAll = async (tokenAddress: string) => {
        //
        const messageItems = messageList.get(tokenAddress);
        const messageIds = messageItems!.map((item: any) => item.message_id);
        setIsLoading(true);
        const res = await leaveMessagePackERC20(searchCiviaWalletAddress, messageIds).then(() => {
            messageApi.open({
                type: 'success',
                content: 'Check bundle send to issure'
            });
        }).catch((err) => {
            console.log(err);
        }).finally(() => {
            setIsLoading(false);
        });
    };

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
        };
    };

    const handleBatchMint = async () => {
        console.log(checkedMessageList);
        const getOneContractArgs = (item: any) => {
            const { sender, receiver, token, id_begin: idBegin, id_end: idEnd, amount, sign } = item.content;
            const signObj = JSON.parse(sign);
            const sigHex = item.customContent.signData.substring(2);
            const receiverR = '0x' + sigHex.slice(0, 64);
            const receiverS = '0x' + sigHex.slice(64, 128);
            const receiverV = parseInt(sigHex.slice(128, 130), 16);
            //
            const addrs = [token];
            const senders = [sender];
            const users = [receiver];
            const beginIds = [idBegin];
            const endIds = [idEnd];
            const amounts = [ethers.utils.parseUnits(amount.toString(), 18).toString()];
            const v = [signObj.v, receiverV];
            const r_s = [signObj.r, signObj.s, receiverR, receiverS];

            return [addrs, senders, users, beginIds, endIds, amounts, v, r_s];
        };

        const mergedContractArgs = checkedMessageList.flat().reduce(([preAddrs, preSenders, preUsers, preUeginIds, preEndIds, preAmounts, preV, preR_s], subItem: any) => {
            const [addrs, senders, users, beginIds, endIds, amounts, v, r_s] = getOneContractArgs(subItem);
            return [preAddrs.concat(addrs), preSenders.concat(senders), preUsers.concat(users), preUeginIds.concat(beginIds), preEndIds.concat(endIds), preAmounts.concat(amounts), preV.concat(v), preR_s.concat(r_s)];
        }, [[], [], [], [], [], [], [], []]);

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
            (checkListRef.current as any).destroy();
            return true;
        }).catch((err) => {
            const errStr = String(err);
            const isStartIdNotMatch = /start id not match/.test(errStr);
            const isDenied = /MetaMask Tx Signature: User denied transaction signature/.test(errStr);
            console.log(err);
            messageApi.open({
                type: 'error',
                content: isStartIdNotMatch ? 'start id not match' : (isDenied ? 'MetaMask Tx Signature: User denied transaction signature' : errStr)
            });
        }).finally(() => {
            setIsLoading(false);
        });
    };

    return (
        <>
            <Spin spinning={isLoading}>
                {contextHolder}
                <div className={styles.body}>
                    <List style={{ visibility: filterMessageList.length ? 'initial' : 'hidden' }}>
                        {
                            filterMessageList.map((item: any, index: number) => {
                                return (
                                    <div key={index}>
                                        <Card title={
                                            <>
                                                <ERC20TokenInfo tokenAddress={item[0].content.token}>
                                                    {
                                                        (tokeName: string, tokenSymbol: string, formatAddr: string) => {
                                                            return <span><label className={styles.label}>Token:</label>{`${tokeName} (${tokenSymbol}) ${formatAddr}`}&nbsp;&nbsp;</span>;
                                                        }
                                                    }
                                                </ERC20TokenInfo>
                                                <ERC20TokenBalance tokenAddress={item[0].content.token} userAddress={metamaskAddress}>
                                                    {
                                                        (res: any) => {
                                                            return res ? <code>{`Balance: ${res / 1e18}`}</code> : null;
                                                        }
                                                    }
                                                </ERC20TokenBalance>
                                            </>
                                        }
                                        extra={
                                            item.length > 1 ? <Button type="link" onClick={() => { handlePackAll(item[0].content.token); }}>Bundle checks</Button> : null
                                            // <Checkbox onChange={handleSelectAll} checked={item.every((su: any) => su.customContent)}>Select all</Checkbox>
                                        }
                                        >
                                            <List.Item><label className={styles.label}>Amount:</label></List.Item>
                                            {
                                                item.map((subItem: any, subIndex: number) => {
                                                    return (
                                                        <TokenItem item={subItem} key={subIndex} onSigned={handleSignedCreater(subItem.content.token, subIndex)} />
                                                    );
                                                })
                                            }
                                        </Card>
                                        <br />
                                    </div>
                                );
                            })
                        }
                    </List>
                    {
                        filterMessageList.length === 0 ? <Empty /> : null
                    }
                </div>

                <ERC20CheckList ref={checkListRef}>
                    {
                        checkedMessageList.length ? (
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
                                                    </List.Item>;
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
                        ) : null
                    }
                </ERC20CheckList>
            </Spin>
        </>
    );
};

export default ERC20Mint;
