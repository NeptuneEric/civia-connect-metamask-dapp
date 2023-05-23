import { FC, useEffect, useState, useRef } from 'react';
import { Spin, Button, List, message, Steps, Space, Card } from 'antd';
import { useConnect, useAccount, useSignMessage } from 'wagmi';
import { ethers } from "ethers";
import { erc20tokenMint } from '../../services/account.service';

import { getErc20Message, getSessionToken } from '../../services/account.service';

import styles from './index.module.css';


const TokenItem: FC<any> = ({ item }) => {
    const [isLoaing, setIsLoading] = useState(false);
    const [step, setStep] = useState<0|1>(0);
    const { data: signData, signMessage: metaMaskSignMessage } = useSignMessage({
        onSuccess: () => {
            setStep(1);
        }
    });
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();
    const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
    const connectMetamaskRef = useRef(false);

    // auto connect metamask
    if(!connectMetamaskRef.current && !metamaskAddress && metaMaskConnectors && metaMaskConnectors.length){
        connectMetamaskRef.current = true;
        metaMaskConnect({ connector: metaMaskConnectors[0] });
    }

    console.log(item);

    //
    const handleSignData = async () => {
        const { receiver, token, id_begin: idBegin, id_end: idEnd, amount,  } = item.content;
        const orderParts = [
            { value: metamaskAddress, type: 'address' },
            { value: receiver, type: 'address' },
            { value: token, type: "address" },
            { value: idBegin, type: "uint256" },
            { value: idEnd, type: "uint256" },
            { value: `${amount * 1e18}`, type: "uint256" },
        ];

        console.log(JSON.stringify(orderParts));
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
            const res = erc20tokenMint(metamaskAddress!, addrs, users, beginIds, endIds, amounts, v, r_s).catch((err) => {
                console.log(err);
            }).finally(() => {
                setIsLoading(false);
            });
            console.log(res);
        }
    }


    return (
        <List.Item
            extra={<div>
                {
                    step === 0? (<Button size='small' onClick={handleSignData}>Sign</Button>) : (<Button size='small' onClick={handleMint}>Mint</Button>)
                }
            </div>}
        >
            <div>Amount: { item.content.amount }</div>
        </List.Item>
    );
};

//
const ERC20Mint: FC<any> = () => {
    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = locationSearch.get('civiaAddress') as string;
    const searchERC20Token = locationSearch.get('erc20token') as string;
    const [currentERC20Token, setCurrentERC20Token] = useState(searchERC20Token || null);
    const [isLoading, setIsLoading] = useState(true);
    const [messageList, setMessageList] = useState<any[]>([]);

    const [messageApi, contextHolder] = message.useMessage();

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
                newML.set(token, newMLItem);
                return newML;
            }, new Map());
            console.log(newMessageMapList);
            console.log(Array.from(newMessageMapList));
            setMessageList(Array.from(newMessageMapList.values()));
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);

    const filterMessageList = currentERC20Token?  messageList.filter((item) => item[0].content.token === currentERC20Token) : messageList;

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
                                    <Card title={item[0].content.token} >
                                        {
                                            item.map((subItem: any, subIndex: number) => {
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
                </div>
            </Spin>
        </>
    );
};

export default ERC20Mint;