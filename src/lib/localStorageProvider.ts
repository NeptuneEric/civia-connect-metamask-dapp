import {
    Cache,
    unstable_serialize as unstableSerialize
} from 'swr';

import { BigNumber } from 'ethers';

export const reviveJsonBigNumber = (_: string, value: any) => {
    if (value?.type === 'BigNumber' && 'hex' in value) {
        return BigNumber.from(value.hex);
    }
    return value;
};

export const localStorageProvider = () => {
    const swrPersistedCache = {
        set: (key: any, value: any) => {
            return localStorage.setItem(unstableSerialize(key), JSON.stringify(value));
        },
        get: (key: any) => {
            try {
                const value = localStorage.getItem(unstableSerialize(key));
                if (!value) {
                    throw new Error('No value found');
                }
                return JSON.parse(value, reviveJsonBigNumber) ?? undefined;
            } catch {
                return undefined;
            }
        },
        delete: (key: any) => {
            return localStorage.removeItem(unstableSerialize(key));
        }
    };

    return swrPersistedCache as any;
};
