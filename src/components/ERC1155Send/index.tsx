
import { FC, useEffect, useState, useRef } from 'react';
import { Button, message, Steps, Spin, Form, Select, Space, Radio, List, RadioChangeEvent } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useConnect, useAccount } from 'wagmi';
import { readContract } from '@wagmi/core';
import { getSynthesizeAddressList } from '../../services/account.service';

import { ERC1155TokenInfo } from '../../components/ERC1155TokenInfo';

import CiviaERC1155Check from '../../../abi/CiviaERC1155Check.json';

import { ReceipientFT } from './ReceipientFT';
import { ReceipientNFT } from './ReceipientNFT';

import styles from './index.module.css';

const CIVIA_ERC20_CONTRACT_ADDRESS = '0xFB85425B4b9bd96AFAC83bb1f756B8A1b8B6A3Ae';

const ERC20Send: FC<any> = () => {
    const locationSearch = new URLSearchParams(location.search);
    const searchCiviaWalletAddress = '0x0';// getFormatedAddress(locationSearch.get('civiaAddress') as string);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(0);
    const { connect: metaMaskConnect, connectors: metaMaskConnectors } = useConnect();
    const { isConnected: isMetaMaskConnected, address: metamaskAddress } = useAccount();
    const connectMetamaskRef = useRef(false);
    const subFormItem = useRef();
    const [messageApi, contextHolder] = message.useMessage();
    const [grantedTokens, setGrantedTokens] = useState([]);
    const [form] = Form.useForm();
    const [tokenType, setTokenType] = useState<'ft'| 'nft'>('ft');
    useEffect(() => {
        if (metamaskAddress) {
            setIsLoading(true);
            readContract({
                address: CIVIA_ERC20_CONTRACT_ADDRESS,
                abi: CiviaERC1155Check.abi,
                functionName: 'getRegisteredTokens',
                args: [metamaskAddress]
            }).then((res) => {
                setGrantedTokens(res as []);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [metamaskAddress]);
    // auto connect metamask
    if (!connectMetamaskRef.current && !metamaskAddress && metaMaskConnectors && metaMaskConnectors.length) {
        connectMetamaskRef.current = true;
        metaMaskConnect({ connector: metaMaskConnectors[0] });
    }

    useEffect(() => {
        if (metamaskAddress && step < 1) {
            setStep(1);
        }
    }, [metamaskAddress, step]);

    const handlePreviousStep = async () => {
        const toStep = step - 1;
        if (toStep === -1) {
            return;
        }
        setStep(toStep);
    };

    const handleNextStep = async () => {
        const toStep = step + 1;
        if (toStep === 5) {
            return;
        } else if (toStep === 1) {
            if (!isMetaMaskConnected) {
                return metaMaskConnect();
            }
        } else if (toStep === 2) {
            const { selectToken } = form.getFieldsValue();
            if (!selectToken) {
                return messageApi.open({
                    type: 'error',
                    content: 'Please select token'
                });
            }
        } else if (toStep === 3) {
            return (subFormItem.current as any).writeCheck();
        } else if (toStep === 4) {
            return (subFormItem.current as any).sendSignData();
        }
        setStep(toStep);
    };

    const selectedToken = form.getFieldValue('selectToken');
    const { userCurrentIds, signDataList } = subFormItem?.current ? (subFormItem.current as any).getFieldValues() : { userCurrentIds: [], signDataList: [] };

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
                                    title: 'Connect wallet'
                                }, {
                                    title: 'Select token to write Check(s)'
                                }, {
                                    title: 'Input receipient address(es)'
                                }, {
                                    title: 'Send Check(s)'
                                }, {
                                    title: 'Success'
                                }
                            ]}
                        />
                    </div>
                    <div className={styles.form}>
                        <Form
                            name="basic"
                            layout="vertical"
                            labelCol={{ span: 8 }}
                            wrapperCol={{ span: 16 }}
                            style={{ maxWidth: 660 }}
                            autoComplete="off"
                            form={form}
                        >
                            <Form.Item
                                label="Select token to write Check(s)"
                                name="selectToken"
                                hidden={step !== 1}
                            >
                                {
                                    <Select >
                                        {
                                            grantedTokens.map((item: string) => {
                                                return (
                                                    <Select.Option value={item} key={item}>
                                                        {
                                                            item && (
                                                                <ERC1155TokenInfo tokenAddress={item}>
                                                                    {
                                                                        (tokeName: string, tokenSymbol: string, formatAddr: string) => {
                                                                            return `${tokeName} (${tokenSymbol}) ${formatAddr}`;
                                                                        }
                                                                    }
                                                                </ERC1155TokenInfo>
                                                            )
                                                        }
                                                    </Select.Option>
                                                );
                                            })
                                        }
                                    </Select>
                                }
                            </Form.Item>
                            <Form.Item
                                hidden={step !== 2}
                            >
                                <Radio.Group onChange={(evt: RadioChangeEvent) => { setTokenType(evt.target.value); }} defaultValue={tokenType}>
                                    <Radio.Button value="ft">Fungible token</Radio.Button>
                                    <Radio.Button value="nft">Non-fungible token</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                            {
                                tokenType === 'ft' ? (
                                    <ReceipientFT ref={subFormItem} selectedToken={selectedToken} form={form} messageApi={messageApi} setIsLoading={setIsLoading} metamaskAddress={metamaskAddress} setStep={setStep} visible={step === 2} />
                                ) : (null)
                            }
                            {
                                tokenType === 'nft' ? (
                                    <ReceipientNFT ref={subFormItem} selectedToken={selectedToken} form={form} messageApi={messageApi} setIsLoading={setIsLoading} metamaskAddress={metamaskAddress} setStep={setStep} visible={step === 2} />
                                ) : (null)
                            }
                            <Form.Item hidden={step !== 3}>
                                {/* <div className={styles.signData}>signData: {signData}</div> */}
                                <List bordered style={{ width: '600px' }}>
                                    {
                                        userCurrentIds.map((item: any, index: number) => {
                                            return (
                                                <List.Item key={item.user + item.inputId}
                                                    actions={[signDataList[index] ? <CheckOutlined style={{ color: 'green' }} /> : null]}
                                                >
                                                    {item.user}&nbsp;(tokenId: {item.inputId})
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
                                    step > 0 && step < 4 ? <Button onClick={handlePreviousStep} >Back</Button> : null
                                }
                                {
                                    step < 4 ? (<Button onClick={handleNextStep} type="primary">{{ 2: 'Write Check(s)', 3: 'Download' }[step] || 'Next'}</Button>) : null
                                }
                            </Space>
                        </div>
                    </div>
                </div>
            </Spin>
        </>
    );
};

export default ERC20Send;
