
import { FC, useEffect, useState, ChangeEvent, useRef } from "react";
import { Button, Input, message, Steps, Spin, Form, Select, Space, Avatar, Image } from 'antd';
import { useConnect, useAccount, useSignMessage } from 'wagmi';
import { readContract, writeContract, signTypedData } from '@wagmi/core'
import { getFollowingList, getSynthesizeAddressList, getUsersOwnerTokenCurrentId, leaveMessageERC20 } from '../../services/account.service';

import CiviaERC20Check from '../../../abi/CiviaERC20Check.json';

import styles from "../../styles/erc20send.module.css"
import { ethers } from "ethers";

const CIVIA_ERC20_CONTRACT_ADDRESS = '0x7fd4c5dE475801D4691Bd325Bf5937b430c516E4';

const ERC20Send: FC<any> = () => {

    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = locationSearch.get('civiaAddress') as string;
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(0);
    const { connect: metaMaskConnect, connectors: metaMaskConnectors, error: ucError, isLoading: ucIsLoading, pendingConnector } = useConnect();
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();
    const connectMetamaskRef = useRef(false);
    const [messageApi, contextHolder] = message.useMessage();
    const [grantedTokens, setGrantedTokens] = useState([]);
    const [followings, setFollowings] = useState<Array<{address: string; id: string; nickName: string;}>>([]);
    const [form] = Form.useForm();
    const [orderParts, setOrderParts] = useState<any[]>([]);

    const { data: signData, error: usmError, isLoading: usmIsLoading, signMessage: metaMaskSignMessage } = useSignMessage();

  useEffect(() => {
    getSynthesizeAddressList(searchCiviaWalletAddress!).then((res) => {
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

  useEffect(() => {
    if(signData){
      const sigHex = signData.substring(2);
      const r = '0x' + sigHex.slice(0, 64);
      const s = '0x' + sigHex.slice(64, 128);
      const v = parseInt(sigHex.slice(128, 130), 16);
      console.log([v, s, r]);
      //
      setStep(3);
    }
  }, [signData]);

  const getUsersOwnerTokenCurrentIdAndSignData = async () => {
    setIsLoading(true);
    const { selectToken, inputAmount, selectFriend } = form.getFieldsValue();
    const res = await getUsersOwnerTokenCurrentId(searchCiviaWalletAddress!, selectFriend, selectToken).finally(() => { setIsLoading(false);});
    if(res && res.code === 0){
      const userCurrentIds = res.result.ownedInfos;
      //
      userCurrentIds.forEach(({ currentId, user }:any) => {
        const orderParts = [
          { value: metamaskAddress, type: 'address' },
          { value: user, type: 'address' },
          { value: selectToken, type: "address" },
          { value: currentId + 1, type: "uint256" },
          { value: currentId + 1, type: "uint256" },
          { value: `${inputAmount * 1e18}`, type: "uint256" },
        ];
        setOrderParts(orderParts);
        console.log(JSON.stringify(orderParts));
        const types = orderParts.map(o => o.type);
        const values = orderParts.map(o => o.value);
        const hash = ethers.utils.solidityKeccak256(types, values);
        metaMaskSignMessage({ message: ethers.utils.arrayify(hash) as any });
      });
    } else {
      messageApi.open({
        type: 'error',
        content: res.msg,
      });
      return null;
    }
    console.log(res);
  }

  const sendSignData = async () => {
    const { selectToken, inputAmount, selectFriend } = form.getFieldsValue();
    const to = followings.reduce((to, item: any) => {
      if(item.metamaskAddressList.includes(selectFriend[0])){
        return item.address;
      }
      return to;
    }, null);
    const res = await leaveMessageERC20(searchCiviaWalletAddress, {
      from: searchCiviaWalletAddress,
      to: to!,
      sign: signData!,
      idBegin: orderParts[3].value,
      idEnd: orderParts[4].value,
      amount: inputAmount,
      token: selectToken,
      sender: metamaskAddress!,
      receiver: orderParts[1]
    }).finally(() => { setIsLoading(false);});
    if(res && res.code === 0){
      setStep(4);
    } else {
      messageApi.open({
        type: 'error',
        content: res.msg,
      });
      return null;
    }
  }

  const handlePreviousStep = async () => {
    const toStep = step - 1;
    if(toStep === -1){
      return;
    }
    setStep(toStep);
  }

  const handleNextStep = async () => {
    const toStep = step + 1;
    if(toStep === 5){
      return;
    } else if (toStep === 1){
      if(!isMetaMaskConnected){
        return metaMaskConnect();
      }
    } else if(toStep === 2){
      const { selectToken } = form.getFieldsValue();
      if(!selectToken){
        return messageApi.open({
          type: 'error',
          content: 'Please select token',
        });
      }
    } else if (toStep === 3){
      const { inputAmount, selectFriend } = form.getFieldsValue();
      if(!inputAmount || !/^[1-9]\d*$/.test(inputAmount)){
        return messageApi.open({
          type: 'error',
          content: 'Please specify token amount',
        });
      }
      if(!selectFriend){
        return messageApi.open({
          type: 'error',
          content: 'Please select receipients(s)',
        });
      }
      await getUsersOwnerTokenCurrentIdAndSignData();
      return;
    } else if(toStep === 4){
      if(!signData){
        return messageApi.open({
          type: 'error',
          content: 'signData is null',
        });
      }
      return await sendSignData();
    }
    setStep(toStep);
  }

  console.log(form.getFieldsValue());

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
                            title: 'Connect wallet',
                        },{
                            title: 'Select token',
                        },{
                            title: 'Select receipient address(es)',
                        },{
                            title: 'Sign requirest(s)',
                        },{
                            title: 'Success',
                        },
                        ]}
                    />
                    </div>
                    <div className={styles.form}>
                    <Form
                      name="basic"
                      layout="vertical"
                      labelCol={{ span: 8 }}
                      wrapperCol={{ span: 16 }}
                      style={{ maxWidth: 600 }}
                      autoComplete="off"
                      form={form}
                    >
                    <Form.Item
                      label="Select token"
                      name="selectToken"
                      hidden={step !== 1}
                      >
                        {
                         <Select >
                         {
                             grantedTokens.map((item: string) => {
                                 return <Select.Option value={item} key={item}>{item}</Select.Option>;
                             })
                         }
                         </Select>
                        }
                      </Form.Item>
                      <Form.Item
                          label="Token amount(symbol)"
                          name="inputAmount"
                          hidden={step !== 2}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                          label="Select receipient(s)"
                          name="selectFriend"
                          hidden={step !== 2}
                          >
                            {
                              followings.length ? (
                                <Select
                                  placeholder="Select a option and change input text above"
                                    // defaultValue={followings[0].address}
                                    mode="multiple"
                                    onChange={(res) => {
                                      console.log(res);
                                    }}
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
                          <Form.Item hidden={step !== 3}>
                            <div className={styles.signData}>signData: {signData}</div>
                          </Form.Item>
                    </Form>
                    <div className={styles.btnWrapper}>
                      <Space>
                        {
                          step >0 ? <Button onClick={handlePreviousStep} >Back</Button>: null
                        }
                        {
                          step<4 ? <Button onClick={handleNextStep} type="primary">Next</Button>: null
                        }
                      </Space>
                    </div>
                  </div>
                </div>
            </Spin>
        </>
    );
}

export default ERC20Send;