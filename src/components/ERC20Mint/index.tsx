import { FC, useEffect, useState } from 'react';
import { Spin, Button, List, message } from 'antd';

import { getErc20Message, getSessionToken } from '../../services/account.service';

import styles from './index.module.css';

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

    console.log(filterMessageList);

    return (
        <>
        <Spin spinning={isLoading}>
            {contextHolder}
                <div className={styles.body}>
                    <List bordered style={{ visibility: filterMessageList.length? 'initial': 'hidden'}}>
                        {
                        filterMessageList.map((item: any, index: number) => {
                                return (
                                    <List.Item
                                        key={index}
                                        actions={[
                                            <Button type='primary'>Mint token</Button>
                                        ]}
                                    >
                                        <div style={{ width: '100%'}}>
                                            <div>{item[0].content.token}</div>
                                            <List.Item.Meta
                                                description={
                                                    <div>
                                                        {
                                                            item.map((subItem: any, subIndex: number) => {
                                                                return (
                                                                    <div key={subIndex}>
                                                                        Amount: { subItem.content.amount }
                                                                    </div>
                                                                );
                                                            })
                                                        }
                                                    </div>
                                                }
                                            />
                                        </div>
                                    </List.Item>
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