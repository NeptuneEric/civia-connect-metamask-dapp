
import { FC, useEffect, useState, ChangeEvent, useRef } from "react";
import { Abi, Contract, ProviderInterface, Call, shortString, number } from 'starknet';
import { Button, Input, message, Steps, Spin, Form, Select, Space, Avatar, Image } from 'antd';
import { useContractRead, useContractWrite, useConnect, useAccount, useSignMessage, useSignTypedData } from 'wagmi';
import { getContract, getWalletClient, readContract, writeContract, signTypedData } from '@wagmi/core'
import { getFollowingList, getSynthesizeAddressList } from '../../services/account.service';

import CiviaERC20Check from '../../../abi/CiviaERC20Check.json';
import TestToken from '../../../abi/TestToken.json';

import styles from "../../styles/erc20send.module.css"
import { ethers } from "ethers";

const CIVIA_ERC20_CONTRACT_ADDRESS = '0x4C1b4A6DD7968DcF3C1b7b5DC5d89B5e4085a2F8';

const ERC20Send: FC<any> = () => {

    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = locationSearch.get('civiaAddress');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(0);
    const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();
    const connectMetamaskRef = useRef(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [grantedTokens, setGrantedTokens] = useState([]);
    const [followings, setFollowings] = useState<Array<{address: string; id: string; nickName: string;}>>([]);
    const [form] = Form.useForm();
    //
    const [testTokenAddress, setTestTokenAddress] = useState('');

    const { data: signData, error: usmError, isLoading: usmIsLoading, signMessage: metaMaskSignMessage } = useSignMessage();

  useEffect(() => {
    getSynthesizeAddressList(searchCiviaWalletAddress!).then((res) => {
      console.log(res);
      setFollowings(res as any);
    });
  }, []);

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
    if(metamaskAddress && step<1){
      setStep(1);
    }
  }, [metamaskAddress]);


  const nextSignData = async () => {
    const orderParts = [
      { value: metamaskAddress, type: 'address' },
      { value: '0x39e60EA6d6417ab2b4a44f714b7503748Ce658eD', type: 'address' },
      { value: grantedTokens[0], type: "address" },
      { value: 1, type: "uint256" },
      { value: 1, type: "uint256" },
      { value: `${1 * 1000000000000000000}`, type: "uint256" },
    ];
    console.log(JSON.stringify(orderParts));
    const types = orderParts.map(o => o.type);
    const values = orderParts.map(o => o.value);
    const hash = ethers.utils.solidityKeccak256(types, values);
    metaMaskSignMessage({ message: ethers.utils.arrayify(hash) as any });
  }

  useEffect(() => {
    if(signData){
      const sigHex = signData.substring(2);
      const r = '0x' + sigHex.slice(0, 64);
      const s = '0x' + sigHex.slice(64, 128);
      const v = parseInt(sigHex.slice(128, 130), 16);
      console.log([v, s, r]);
    }
  }, [signData]);

    return (
        <>
            <Spin spinning={isLoading}>
                {contextHolder}
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
                      form={form}
                    >
                    {
                      step === 1 ? (
                          <>
                          <Form.Item
                          label="Select Token"
                          name="selectToken"
                          >
                            {
                              grantedTokens.length? (
                                <Select
                                  placeholder="Select a option and change input text above"
                                  defaultValue={grantedTokens[0]}
                                  >
                                  {
                                      grantedTokens.map((item: string) => {
                                          return <Select.Option value={item} key={item}>{item}</Select.Option>;
                                      })
                                  }
                                  </Select>
                              ): null
                            }
                          </Form.Item>
                          <Form.Item>
                          <div className={styles.btnWrapper}>
                            <Button onClick={() => { setStep(2);}} type="primary">Next</Button>
                          </div>
                          </Form.Item>
                          </>
                      ): null
                    }

                    {
                      step === 2 ? (
                          <>
                          <Form.Item
                          label="Input amount"
                          name="inputAmount"
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                          label="Select Friend"
                          name="selectFriend"
                          >
                            {
                              followings.length ? (
                                <Select
                                  placeholder="Select a option and change input text above"
                                    // defaultValue={followings[0].address}
                                    mode="multiple"
                                  >
                                    {
                                      followings.map((item: any) => {
                                        return (
                                          <Select.OptGroup key={item.id} label={item.nickName}>
                                            {
                                              item.metamaskAddressList.map((mItem: any) => {
                                                  return <Select.Option value={mItem} key={mItem}><Avatar src='https://fleek.fynut.com/c33f0f64-9add-4351-ac8c-c869d382d4f8-bucket/civia/metamask-fox.svg' className={styles.avantar} />{mItem}</Select.Option>;
                                              })
                                            }
                                          </Select.OptGroup>
                                        );
                                      })
                                    }
                                </Select>
                              ): null
                            }
                          </Form.Item>
                          <Form.Item>
                          <div className={styles.btnWrapper}>
                            <Space>
                              <Button onClick={() => { setStep(1);}} >&nbsp;Per&nbsp;</Button>
                              <Button onClick={nextSignData} type="primary">Next</Button>
                            </Space>
                          </div>
                          </Form.Item>
                          </>
                      ): null
                      }
                    </Form>
                </div>
                </div>
            </Spin>
        </>
    );
}

export default ERC20Send;