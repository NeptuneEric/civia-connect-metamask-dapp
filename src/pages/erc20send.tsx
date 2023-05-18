import { useEffect, useState, ChangeEvent, useRef } from "react";
import type { NextPage } from "next";
import Head from "next/head"
import dynamic from 'next/dynamic';
import { Button, Input, message, Steps, Spin, Form, Select } from 'antd';
import { useContractRead, useContractWrite, useConnect, useAccount, useSignMessage } from 'wagmi';
import { getContract, getWalletClient, readContract, writeContract } from '@wagmi/core'

import CiviaERC20Check from '../../abi/CiviaERC20Check.json';
import TestToken from '../../abi/TestToken.json';

import styles from "../styles/erc20send.module.css"

const Header = dynamic(import('../components/Header'), { ssr: false });
const Footer = dynamic(import('../components/Footer'), { ssr: false });

const CIVIA_ERC20_CONTRACT_ADDRESS = '0x4C1b4A6DD7968DcF3C1b7b5DC5d89B5e4085a2F8';


const Erc20Send: NextPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);
  const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
  const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();
  const connectMetamaskRef = useRef(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [grantedTokens, setGrantedTokens] = useState([]);
  //
  const [testTokenAddress, setTestTokenAddress] = useState('');

  useEffect(() => {
    if(metamaskAddress){
      setIsLoading(true);
      readContract({
        address: CIVIA_ERC20_CONTRACT_ADDRESS,
        abi: CiviaERC20Check.abi,
        functionName: 'getUserRegistERC20Ids',
        args: [metamaskAddress]
      }).then((res) => {
        return readContract({
          address: CIVIA_ERC20_CONTRACT_ADDRESS,
          abi: CiviaERC20Check.abi,
          functionName: 'getERC20TokenAddrByIds',
          args: [res]
        });
      }).then((res) => {
        setGrantedTokens(res as []);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [metamaskAddress]);
  // auto connect metamask
  if(!connectMetamaskRef.current && !metamaskAddress && metaMaskConnectors && metaMaskConnectors.length){
    connectMetamaskRef.current = true;
    metaMaskConnect({ connector: metaMaskConnectors[0] });
  }

  useEffect(() => {
    if(metamaskAddress){
      setStep(1);
    }
  }, [metamaskAddress]);

  return (
    <div>
      <Spin spinning={isLoading}>
        {contextHolder}
        <Head>
          <title>Send Token</title>
          <link rel="icon" href="/civia-icon.svg" />
        </Head>
          <Header title='Send Token'  />
          <main className='main'>
            <div className={styles.body}>
              <div className={styles.steps}>
                <Steps
                    size="small"
                    current={step}
                    items={[
                      {
                        title: 'Connect Metamask',
                      },
                      {
                        title: 'Select Token',
                      },
                      {

                        title: 'Select user address',
                        },
                      {
                        title: 'Sign Data & Send',
                      },{
                        title: 'Success',
                      },
                    ]}
                  />
                </div>
                <div>
                <Form
                  name="basic"
                  layout="vertical"
                  labelCol={{ span: 8 }}
                  wrapperCol={{ span: 16 }}
                  style={{ maxWidth: 600 }}
                  autoComplete="off"
                >
                 {
                  step === 1 ? (
                    <>
                      <Form.Item
                      label="Select Token"
                      name="selectToken"
                    >
                      <Select
                        placeholder="Select a option and change input text above"
                        // onChange={onGenderChange}
                        >
                        {
                            grantedTokens.map((item: string) => {
                                return <Select.Option value={item} key={item}>{item}</Select.Option>;
                            })
                        }
                        </Select>
                    </Form.Item>
                    </>
                  ): null}
                  </Form>
            </div>
            </div>
        </main>
        <Footer />
    </Spin>
    </div>
  );
};

export default Erc20Send;