import { FC, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Form, Input } from 'antd';
import { InputTags } from '../../components/InputTags';
import { ERC1155TokenInfo } from '../../components/ERC1155TokenInfo';

export const ReceipientNFT: FC<any> = forwardRef(({
    selectedToken
}, ref) => {
    useImperativeHandle(ref, () => {
        return {
            getFieldValues: () => {}
        };
    });
    //
    return (
        <div>
            <Form.Item
                label={
                    <div>Token Id</div>
                }
                name="inputIdNft"
            >
                <Input />
            </Form.Item>
            <Form.Item
                label={
                    <div>
                        Token amount
                        {
                            selectedToken && (
                                <ERC1155TokenInfo tokenAddress={selectedToken}>
                                    {
                                        (tokeName: string, tokenSymbol: string, formatAddr: string) => {
                                            return ` (${tokenSymbol})`;
                                        }
                                    }
                                </ERC1155TokenInfo>
                            )
                        }
                    </div>
                }
                name="inputAmountNft"
                initialValue={1}
            >
                <Input />
            </Form.Item>
            <Form.Item
                label="Receipient(s)"
                name="selectFriendNft"
            >
                <InputTags onChange={(value: string[]) => { console.log(value); }} single={true} />
            </Form.Item>
        </div>
    );
});
