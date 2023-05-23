
import { FC, useEffect, useState, ChangeEvent, useRef } from "react";
import { Button, Input, message, Steps, Spin, Form, Select, Space, Avatar, List } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useConnect, useAccount, useSignMessage } from 'wagmi';
import { readContract, writeContract, signTypedData } from '@wagmi/core'
import { getFollowingList, getSynthesizeAddressList, getUsersOwnerTokenCurrentId, leaveMessageERC20 } from '../../services/account.service';

import CiviaERC20Check from '../../../abi/CiviaERC20Check.json';

import styles from "./index.module.css"
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

    const { signMessage: metaMaskSignMessage } = useSignMessage({
      onSuccess: (signData: any) => { 
        const sigHex = signData.substring(2);
        const r = '0x' + sigHex.slice(0, 64);
        const s = '0x' + sigHex.slice(64, 128);
        const v = parseInt(sigHex.slice(128, 130), 16);
        setSignDataList(pre => [...pre, {r,s,v}]);
      },
      onError: () => { setSignDataList(pre => [...pre, null]) }
    });
    const [signDataList, setSignDataList] = useState<any[]>([]);
    const [userCurrentIds, setUserCurrentIds] = useState<string[]>([]);

  useEffect(() => {
    if(userCurrentIds.length && userCurrentIds.length === signDataList.length){
      setStep(3);
    }
  }, [signDataList, userCurrentIds]);

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

  const getUsersOwnerTokenCurrentIdAndSignData = async () => {
    setIsLoading(true);
    const { selectToken, inputAmount, selectFriend } = form.getFieldsValue();
    const addrsMap = followings.reduce((addrsMap: Map<string, string>, item: any) => {
      if(selectFriend.includes(item.metamaskAddressList[0])){
        addrsMap.set(item.address, item.metamaskAddressList[0]);
      }
      return addrsMap;
    }, new Map());
    //
    const res = await getUsersOwnerTokenCurrentId(searchCiviaWalletAddress!, Array.from(addrsMap.keys()), selectToken).finally(() => { setIsLoading(false);});
    if(res && res.code === 0){
      const userCurrentIds = res.result.ownedInfos.map((item: any) => (
        {
          ...item,
          user: addrsMap.get(item.user)
        }
      ));
      setUserCurrentIds(userCurrentIds);
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

    const promises = userCurrentIds.map(({ currentId, user}: any, index: number) => {
      const signData = signDataList[index];
        if(!signData){
          return Promise.resolve();
        }
        const to = followings.reduce((to, item: any) => {
          if(item.metamaskAddressList.includes(user)){
            return item.address;
          }
          return to;
        }, null);
        //
        return leaveMessageERC20(searchCiviaWalletAddress, {
          from: searchCiviaWalletAddress,
          to: to!,
          sign: JSON.stringify(signData),
          idBegin: currentId + 1,
          idEnd: currentId + 1,
          amount: inputAmount,
          token: selectToken,
          sender: metamaskAddress!,
          receiver: user
        })
    });

    console.log(promises);

    const resList = await Promise.all(promises).catch(err => {
      console.log(err);
    }).finally(() => {
      setIsLoading(false);
    });
    setStep(4);
  }

  const handlePreviousStep = async () => {
    const toStep = step - 1;
    if(toStep === -1){
      return;
    }
    if(toStep === 2){
      setSignDataList([]);
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
      return await sendSignData();
    }
    setStep(toStep);
  }

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
                                              item.metamaskAddressList.slice(0, 1).map((mItem: any) => {
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
                            {/* <div className={styles.signData}>signData: {signData}</div> */}
                            <List bordered style={{ width: '500px'}}>
                              {
                                userCurrentIds.map((item: any, index: number) => {
                                  return (
                                    <List.Item key={item.user}
                                      actions = {[signDataList[index]? <CheckOutlined style={{ color: 'green'}}/>: null]}
                                    >
                                      {item.user}
                                    </List.Item>
                                  );
                                })
                              }
                            </List>
                          </Form.Item>
                    </Form>
                    <div className={styles.btnWrapper}>
                      <Space>
                        {
                          step >0 && step <4 ? <Button onClick={handlePreviousStep} >Back</Button>: null
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