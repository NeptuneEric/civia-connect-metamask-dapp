import { FC, useEffect, useState, useRef, ReactElement, useImperativeHandle, forwardRef } from 'react';
import { Spin, Button, List, message, Steps, Space, Card, Empty, Checkbox, notification } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useContractRead, useContractWrite, useConnect, useAccount, useSignMessage } from 'wagmi';
import { getContract, getWalletClient, readContract, writeContract } from '@wagmi/core'
import { ethers } from "ethers";
import CiviaERC20Check from '../../../abi/CiviaERC20Check.json';

import { ERC20TokenInfo } from '../ERC20TokenInfo';

import { getUserERC20MessagesUnPacked, leaveMessageERC20PackDone } from '../../services/account.service';

const CIVIA_ERC20_CONTRACT_ADDRESS = '0x8a647C33fe1fb520bDbcbA10d88d0397F5FdC056';

import styles from './index.module.css';

const TokenItem: FC<any> = ({ item, onSigned }) => {
    return (
        <>
            <List.Item>
                <div><label className={styles.label} />{ item.amount }</div>
            </List.Item>
        </>
    );
};
//
const ERC20Mint: FC<any> = () => {
    const [refreshMessageList, setRefreshMessageList] = useState(1);
    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = locationSearch.get('civiaAddress') as string;
    const searchERC20Token = locationSearch.get('erc20token') as string;
    const [isLoading, setIsLoading] = useState(true);
    const [unPackMessageList, setUnPackMessageList] = useState<Map<string, any[]>>(new Map());
    //
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();
    const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
    const connectMetamaskRef = useRef(false);
    const onSignDataFn = useRef<Function>();
    const { data: signData, signMessage: metaMaskSignMessage } = useSignMessage({
        onSuccess: (res) => {
            onSignDataFn.current && onSignDataFn.current(res);
        },
        onError: (err) =>{
            console.log(err);
            const errStr = String(err);
            const isDenied = /MetaMask Tx Signature: User denied transaction signature/.test(errStr);
            messageApi.open({
                type: 'error',
                content: isDenied? 'MetaMask Tx Signature: User denied transaction signature': errStr
            });
        }
    });

    console.log(unPackMessageList);

    // auto connect metamask
    if(!connectMetamaskRef.current && !metamaskAddress && metaMaskConnectors && metaMaskConnectors.length){
        connectMetamaskRef.current = true;
        metaMaskConnect({ connector: metaMaskConnectors[0] });
    }

    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        getUserERC20MessagesUnPacked(searchCiviaWalletAddress).then(({ code, result}) => {
            if(code === 0){
                const newMessageList = result.messages.reduce((newML: Map<string, any>, item: any, index: number) => {
                    const content = JSON.parse(item.content);
                    const newMLItem: any[] = [];
                    content.packContents.forEach((contentItem: any) => {
                        newMLItem.push(contentItem);
                    });
                    newML.set(item.message_id, {
                        ...item,
                        messageIds: content.messageIds,
                        content: newMLItem.sort((a: any, b: any) => {
                            return a.id_begin > b.id_begin ? 1: -1;
                        })
                    });
                    return newML;
                }, new Map());
                setUnPackMessageList(newMessageList);
            }
        }).catch((err) => {
            console.log(err);
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    const handleSign = async (tokenAddress: string) => {
        const unPackMessageItem: any = unPackMessageList.get(tokenAddress);
        console.log(unPackMessageItem);
        
        const mergedMessageContent = unPackMessageItem.content.reduce((preContent: any, content: any) => {
            const newContent = {
                amount: Number(preContent.amount) + Number(content.amount),
                id_begin: Math.min(preContent.id_begin || content.id_begin, content.id_begin),
                id_end: Math.max(preContent.id_end || content.id_end, content.id_end),
                receiver: content.receiver,
                sender: content.sender,
                sign: null,
                token: content.token
            };
            return newContent;
        }, {
            amount: 0,
            id_begin: 0,
            id_end: 0,
            receiver: null,
            sender: null,
            sign: null,
            token: null
        });
        //
        const { receiver, token, id_begin: idBegin, id_end: idEnd, amount } = mergedMessageContent;
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
        //
        onSignDataFn.current = (signData: string) => {
            
            doLeaveMessageERC20PackDone({signData, mergedMessageContent, unPackMessageItem});
        };
    }

    const doLeaveMessageERC20PackDone = async ({signData, mergedMessageContent, unPackMessageItem}: any) => {
        console.log(unPackMessageItem);
        if(signData){
            const sigHex = signData.substring(2);
            const r = '0x' + sigHex.slice(0, 64);
            const s = '0x' + sigHex.slice(64, 128);
            const v = parseInt(sigHex.slice(128, 130), 16);
            //
            leaveMessageERC20PackDone(searchCiviaWalletAddress, {
                from: searchCiviaWalletAddress,
                to: unPackMessageItem.to,
                sign: JSON.stringify({ r, s, v}),
                idBegin: mergedMessageContent.id_begin,
                idEnd: mergedMessageContent.id_end,
                amount: mergedMessageContent.amount,
                token: mergedMessageContent.token,
                sender: mergedMessageContent.sender,
                receiver: mergedMessageContent.receiver,
                packMsgId: unPackMessageItem.message_id,
                messageIds: unPackMessageItem.messageIds,
            });
        }
    }


    const filterMessageList = Array.from(unPackMessageList.values());

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
                                        <>
                                            <ERC20TokenInfo tokenAddress={item.content[0].token}>
                                                {
                                                    (tokeName: string, tokenSymbol: string, formatAddr: string) => {
                                                        return <span><label className={styles.label}>Token:</label>{`${tokeName} (${tokenSymbol}) ${formatAddr}`}&nbsp;&nbsp;</span>;
                                                    }
                                                }
                                            </ERC20TokenInfo>
                                        </>
                                        }
                                        extra={
                                            <Button type="link" onClick={() => { handleSign(item.message_id);}}>Pack sign</Button>
                                        }
                                    >
                                        <List.Item><label className={styles.label}>Amount:</label></List.Item>
                                        {
                                            item.content.map((subItem: any, subIndex: number) => {
                                                return (
                                                    <TokenItem item={subItem} key={subIndex} />
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
            </Spin>
        </>
    );
};

export default ERC20Mint;