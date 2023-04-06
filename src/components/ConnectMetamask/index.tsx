import { FC, useEffect, useState, useRef } from 'react';
import { Button, Steps, Card, Space, Spin, message } from 'antd';
import styles from './index.module.css';
import { AccountInterface } from 'starknet';
import { useConnect, useAccount, useSignMessage } from 'wagmi';
import { verifyMessage } from 'ethers/lib/utils';
import axios from 'axios';
import civiaAccountAbi from '../../../abi/ArgentAccount.json';

import { truncateHex } from '../../services/address.service';

import {
    chainId as civiaChainId,
    connectWallet as connectCiviaWallet,
    silentConnectWallet as silentConnectCiviaWallet,
  } from '../../services/wallet.service';

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
    //
    const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
    const { data: signData, error: usmError, isLoading: usmIsLoading, signMessage: metaMaskSignMessage } = useSignMessage();
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();

    console.log('----' + civiaWalletAddress);

    

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
    useEffect(() => {
        !civiaWalletAddress && handleConnectCiviaClick(true);
    }, []);

    const bindTwoAddress = async (civiaWalletAddress: string, metamaskAddress: string ) => {
        await getSessionToken({ account: civiaWalletAddress });
        const bindRes = await bindExtraAddress({ account: civiaWalletAddress, extraAddress: metamaskAddress });
        return bindRes;
    }

    useEffect(() => {
        if(civiaWalletAddress && metamaskAddress && signData){
            const transactions = {
                contractAddress: civiaWalletAddress,
                entrypoint: "bindAddress",
                calldata: [metamaskAddress, '1'],
            };

            const extensionId = document.getElementById('argent-x-extension')?.getAttribute('data-extension-id');

            sendMessage({ type: 'OPEN_UI'}, extensionId!);
            sendMessage({
                    type: "EXECUTE_TRANSACTION",
                    data: {
                        transactions
                    }
                }, extensionId!);
            // setIsLoading(true);
            // bindTwoAddress(civiaWalletAddress, metamaskAddress!).then(({ code, msg }) => {
            //     if(code === 0){
            //         messageApi.open({
            //             type: 'success',
            //             content: 'bind success',
            //           });
            //           setCurrent(3);
            //     }else {
            //         messageApi.open({
            //             type: 'error',
            //             content: msg,
            //           });
            //     }
            // }).finally(() => {
            //     setIsLoading(false);
            // });
        }
    }, [civiaWalletAddress, metamaskAddress, signData, messageApi]);


    useEffect(() => {
        if(!metamaskAddress){
            return setCurrent(0);
        }
        if(!signData){
            return setCurrent(1);
        }
        setCurrent(2);
    }, [civiaWalletAddress, metamaskAddress, signData]);


    return (
        <Spin spinning={isLoading}>
            {contextHolder}
            <Space direction='vertical' style={{ width: '100%'}}>
                <Card>
                <Steps
                    direction="vertical"
                    current={current}
                    items={[
                    {
                        title: 'Connect Civia',
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
                            <div className={styles.step_desc}><Button onClick={() => { metaMaskSignMessage({ message: 'civia' });}}>Sign</Button></div>
                        ),
                    },
                    {
                        title: 'Finish'
                    }
                    ]}
                />
             </Card>
            </Space>
        </Spin>
    );
}

export default ConnectMetamask;