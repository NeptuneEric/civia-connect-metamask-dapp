import { WagmiConfig, createConfig, configureChains, mainnet } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { bscTestnet } from '@wagmi/core/chains';

import "../styles/globals.css"

import type { AppProps } from "next/app"

function MyApp({ Component, pageProps }: AppProps) {
  const { chains, publicClient, webSocketPublicClient } = configureChains(
    [bscTestnet],
    [publicProvider()],
  )
   
  const config = createConfig({
    autoConnect: true,
    publicClient,
    webSocketPublicClient,
  })

    return (
        <div>
            <WagmiConfig config={config}>
              <Component {...pageProps} />
            </WagmiConfig>
        </div>
    );
}

export default MyApp
