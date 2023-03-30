import { FC, useEffect, useState, useRef } from 'react';
import { Button, Steps, Card, Space } from 'antd';
import styles from './index.module.css';
import { AccountInterface } from 'starknet';
import { useConnect, useAccount, useSignMessage } from 'wagmi';
import { verifyMessage } from 'ethers/lib/utils';

import { truncateHex } from '../../services/address.service';

import {
    chainId as civiaChainId,
    connectWallet as connectCiviaWallet,
    silentConnectWallet as silentConnectCiviaWallet,
  } from '../../services/wallet.service';

const ConnectMetamask: FC<any> = () => {
    const [civiaWalletAddress, setCiviaWalletAddress] = useState<string>();
    const [supportSessions, setSupportsSessions] = useState<boolean | null>(null);
    const [chain, setChain] = useState(civiaChainId());
    const [isCiviaConnected, setIsCiviaConnected] = useState(false);
    const [civiaAccount, setCiviaAccount] = useState<AccountInterface | null>(null);
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
    useEffect(() => {
        handleConnectCiviaClick(true);
    }, []);

    return (
        <div>
            <Space direction='vertical' style={{ width: '100%'}}>
                <Card>
                <Steps
                    direction="vertical"
                    current={0}
                    items={[
                    {
                        title: 'Connect Civia',
                        description: isCiviaConnected ? (
                                <div className={styles.step_desc}>Wallet address: <code>{civiaWalletAddress && truncateHex(civiaWalletAddress)}</code></div>
                            ): <div className={styles.step_desc}><Button type='primary' onClick={() => {handleConnectCiviaClick();}}>Connect</Button></div>,
                    },
                    {
                        title: 'Civia sign message',
                        description: <div className={styles.step_desc}><Button disabled>Sign</Button></div>,
                    },
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
        </div>
    );
}

export default ConnectMetamask;