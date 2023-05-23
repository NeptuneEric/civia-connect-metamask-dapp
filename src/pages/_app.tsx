import { WagmiConfig, createConfig, configureChains, mainnet } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { bscTestnet } from '@wagmi/core/chains';
import { SWRConfig } from 'swr';

import "../styles/globals.css"

import type { AppProps } from "next/app"

function localStorageProvider() {
  if (typeof window !== 'undefined') {
    const map = new Map(JSON.parse(localStorage.getItem('app-cache') || '[]'))
 
    window.addEventListener('beforeunload', () => {
      const appCache = JSON.stringify(Array.from(map.entries()))
      localStorage.setItem('app-cache', appCache)
    })

    return map as Map<any, any> 
  } else {
    return new Map();
  }
}

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
          <SWRConfig value={{ provider: localStorageProvider }}>
            <WagmiConfig config={config}>
              <Component {...pageProps} />
            </WagmiConfig>
          </SWRConfig>
        </div>
    );
}

export default MyApp
