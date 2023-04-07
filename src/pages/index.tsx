import { supportsSessions } from "@argent/x-sessions"
import type { NextPage } from "next"
import Head from "next/head"
import dynamic from 'next/dynamic';

import styles from "../styles/Home.module.css"

const ConnectMetamask = dynamic(import('../components/ConnectMetamask'), { ssr: false });
const Footer = dynamic(import('../components/Footer'), { ssr: false });

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Civia connect MetaMask dapp</title>
        <link rel="icon" href="/civia-icon.svg" />
      </Head>

      <main className={styles.main}>
        <ConnectMetamask />
      </main>
      <Footer />
    </div>
  )
}

export default Home
