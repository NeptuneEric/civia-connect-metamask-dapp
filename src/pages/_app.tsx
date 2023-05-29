import { WagmiConfig, createConfig, configureChains, mainnet } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { bscTestnet } from '@wagmi/core/chains';
import { SWRConfig } from 'swr';

import { customBscTestnet } from '../lib/bscTestNetConfig';
import { localStorageProvider } from '../lib/localStorageProvider';

import '../styles/globals.css';

import type { AppProps } from 'next/app';

function MyApp ({ Component, pageProps }: AppProps) {
    const { chains, publicClient, webSocketPublicClient } = configureChains(
        [customBscTestnet],
        [publicProvider()]
    );

    const config = createConfig({
        autoConnect: true,
        publicClient,
        webSocketPublicClient
    });

    return (
        <div>
            <SWRConfig value={{ provider: localStorageProvider }}>
                <WagmiConfig config={config}>
                    <Component {...pageProps} />
                </WagmiConfig>
            </SWRConfig>
        </div>
    );
}

export default MyApp;
