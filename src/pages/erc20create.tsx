import type { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const ERC20Create = dynamic(import('../components/ERC20Create'), { ssr: false });
const Header = dynamic(import('../components/Header'), { ssr: false });
const Footer = dynamic(import('../components/Footer'), { ssr: false });

const Erc20Mint: NextPage = () => {
    return (
        <div>
            <Head>
                <title>Register tokens</title>
                <link rel="icon" href="/civia-icon.svg" />
            </Head>
            <Header title='Register tokens' />
            <main className='main'>
                <ERC20Create />
            </main>
            <Footer />
        </div>
    );
};

export default Erc20Mint;
