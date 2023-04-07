import { FC, useEffect, useState, useRef } from 'react';
import { Button, Steps, Card, Space, Spin, message, Image, Avatar } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { AccountInterface, Provider, number } from 'starknet';
import { useConnect, useAccount, useSignMessage } from 'wagmi';
import { useInterval } from 'ahooks';
import { verifyMessage } from 'ethers/lib/utils';
import axios from 'axios';
//
import { truncateHex, getAccountImageUrlByAddress } from '../../services/address.service';
import { chainId as civiaChainId, connectWallet as connectCiviaWallet, silentConnectWallet as silentConnectCiviaWallet } from '../../services/wallet.service';

import styles from './index.module.css';

const provider = new Provider();

const sendMessage = (msg: any, extensionId: string) => {
    return window.postMessage({ ...msg, extensionId }, window.location.origin);
}

export const getSessionToken = async ({ account }: any) => {
    const key = `${account},token`;
    const token = window.localStorage.getItem(key);

    if (token) {
        return token;
    } else {
        const res = await axios.post('/api/getSessionToken', { account });
        window.localStorage.setItem(key, res.headers['session-token'] || '');
        return res;
    }
};

export const bindExtraAddress = async (data: { account: string, extraAddress: string }) => {
    const { account, extraAddress } = data;
    const key = `${account},token`;
    const response = await axios.post('/api/app/mockBind',
        {
            civia_address: account,
            metamast_address: extraAddress
        },
        {
            headers: {
                authorization: `Bearer ${window.localStorage.getItem(key) || ''}`,
                'Content-type': 'application/json;charset=utf-8'
            }
        });
    return Promise.resolve(response.data);
};

const ConnectMetamask: FC<any> = () => {
    const locationSearch = new URLSearchParams(location.search);
    const [isLoading, setIsLoading] = useState(false);
    const [current, setCurrent] = useState(0);
    const [messageApi, contextHolder] = message.useMessage();
    const [civiaWalletAddress, setCiviaWalletAddress] = useState<string | undefined | null>(locationSearch.get('civiaAddress'));
    const [supportSessions, setSupportsSessions] = useState<boolean | null>(null);
    const [chain, setChain] = useState(civiaChainId());
    const [isCiviaConnected, setIsCiviaConnected] = useState(civiaWalletAddress? true: false);
    const [civiaAccount, setCiviaAccount] = useState<AccountInterface | null>(null);
    const [allBindedAddress, setAllBindedAddress] = useState<string[]>([]);
    //
    const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
    const { data: signData, error: usmError, isLoading: usmIsLoading, signMessage: metaMaskSignMessage } = useSignMessage();
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();

    //
    const handleConnectCiviaClick = async (silence: Boolean = false) => {
        const wallet = await (silence ? silentConnectCiviaWallet(): connectCiviaWallet());
        setCiviaWalletAddress(wallet?.selectedAddress)
        setChain(civiaChainId())
        setIsCiviaConnected(!!wallet?.isConnected)
        if (wallet?.account) {
            setCiviaAccount(wallet.account)
        }
        setSupportsSessions(null)
    }

    //
    const getAllBindAddress = (civiaWalletAddress: string) => {
        return provider.callContract({
            contractAddress: civiaWalletAddress.toLowerCase(),
            entrypoint: 'getAllBindedAddrss',
            calldata: []
        }).then(({ result }) => {
            return result.slice(1);
        });
    }
    //
    useEffect(() => {
        !civiaWalletAddress && handleConnectCiviaClick(true);
    }, []);

    useEffect(() => {
        if(civiaWalletAddress){
            setIsLoading(true);
            getAllBindAddress(civiaWalletAddress).then((result) => {
                result && setAllBindedAddress(result);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [civiaWalletAddress]);

    useInterval(() => {
        if(civiaWalletAddress){
            getAllBindAddress(civiaWalletAddress).then((result) => {
                result && setAllBindedAddress(result);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, 5e3);

    useEffect(() => {
        if(civiaWalletAddress && metamaskAddress && signData){
            setIsLoading(true);
            //
            const transactions = {
                contractAddress: civiaWalletAddress,
                entrypoint: "bindAddress",
                calldata: [metamaskAddress, '1'],
            };

            const extensionId = document.getElementById('civia-extension')?.getAttribute('data-extension-id');

            sendMessage({ type: 'OPEN_UI'}, extensionId!);
            sendMessage({
                    type: "EXECUTE_TRANSACTION",
                    data: {
                        transactions
                    }
                }, extensionId!);
        }
    }, [civiaWalletAddress, metamaskAddress, signData, messageApi]);


    useEffect(() => {
        if(!metamaskAddress){
            return setCurrent(0);
        }
        if(allBindedAddress.length){
            const hasInAllBindedAddressList = allBindedAddress.some((address) => {
                return number.toBN(address).eq(number.toBN(metamaskAddress));
            });
            if(hasInAllBindedAddressList){
                return setCurrent(3);
            }
        }
        if(!signData){
            return setCurrent(1);
        }
        setCurrent(2);
    }, [civiaWalletAddress, metamaskAddress, signData, allBindedAddress]);



    return (
        <Spin spinning={isLoading}>
            {contextHolder}
            <div className={styles.title}>Bind Metamask account</div>
            <div className={styles.step_card}>
                <Space direction='vertical' style={{ width: '100%'}}>
                    <Card style={{ border: '0px'}}>
                    <Steps
                        direction="vertical"
                        current={current}
                        items={[
                        {
                            title: isCiviaConnected ? `Civia Account: ${locationSearch.get('nickName') || 'Unknow'}` : 'Connect Civia',
                            description: isCiviaConnected ? (
                                    <div className={styles.step_desc}>Wallet address: <code>{civiaWalletAddress && truncateHex(civiaWalletAddress)}</code></div>
                                ): <div className={styles.step_desc}><Button type='primary' onClick={() => {handleConnectCiviaClick();}} >Connect</Button></div>,
                        },
                        // {
                        //     title: 'Civia sign message',
                        //     description: <div className={styles.step_desc}><Button disabled>Sign</Button></div>,
                        // },
                        {
                            title: 'Connect Metamask',
                            description: isMetaMaskConnected ? (
                                <div className={styles.step_desc}>Wallet address: <code><div className={styles.text_break}>{metamaskAddress && truncateHex(metamaskAddress)}</div></code></div>
                            ) : (
                                <div className={styles.step_desc}>
                                    {
                                        metaMaskConnectors.map((connector, index) => <Button key={index} type='primary' onClick={() => metaMaskConnect({ connector })}>Connect</Button>)
                                    }
                                </div>
                            ),
                        },
                        {
                            title: 'Metamask sign message',
                            description: signData ? (
                                <div className={styles.step_desc}><code><div className={styles.text_break}>{signData}</div></code></div>
                            ): (
                                <div className={styles.step_desc}><Button onClick={() => { metaMaskSignMessage({ message: 'civia' });}} disabled={!metamaskAddress || metamaskAddress.length<10 || current >= 3}>Sign</Button></div>
                            ),
                        },
                        {
                            title: 'Connected',
                            description: current >=3 ? (
                                <div className={styles.connected}>
                                    <div><Avatar src={getAccountImageUrlByAddress({ accountAddress: civiaWalletAddress || '0x0'})} /></div>
                                    <div><LinkOutlined /></div>
                                    <div><Avatar src='https://storage.fleek.zone/c33f0f64-9add-4351-ac8c-c869d382d4f8-bucket/civia/metamask-fox.svg' /></div>
                                </div>
                            ): (null)
                        }
                        ]}
                    />
                </Card>
            </Space>
            </div>
        </Spin>
    );
}

export default ConnectMetamask;