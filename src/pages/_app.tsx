import { ConfigProvider } from 'antd';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { SWRConfig } from 'swr';
import type { AppProps } from 'next/app';

import { customNetConfig } from '../lib/customNetConfig';
import { localStorageProvider } from '../lib/localStorageProvider';

import '../styles/globals.css';

function MyApp ({ Component, pageProps }: AppProps) {
    const { publicClient, webSocketPublicClient } = configureChains(
        [customNetConfig],
        [publicProvider()]
    );

    const config = createConfig({
        autoConnect: true,
        publicClient,
        webSocketPublicClient
    });

    return (
        <div>
            <ConfigProvider
                theme={{
                    token: {
                        // colorPrimary: 'rgba(0, 125, 40, 1)',
                        fontSize: 14
                    }
                }}
            >
                <SWRConfig value={{ provider: localStorageProvider }}>
                    <WagmiConfig config={config}>
                        <Component {...pageProps} />
                    </WagmiConfig>
                </SWRConfig>
            </ConfigProvider>
        </div>
    );
}

export default MyApp;
