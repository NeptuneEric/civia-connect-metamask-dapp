import type { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const ERC1155Create = dynamic(import('../components/ERC1155Create'), { ssr: false });
const Header = dynamic(import('../components/Header'), { ssr: false });
const Footer = dynamic(import('../components/Footer'), { ssr: false });

const ERC1155CreatePage: NextPage = () => {
    return (
        <div>
            <Head>
                <title>Register tokens</title>
                <link rel="icon" href="/civia-icon.svg" />
            </Head>
            <Header title={
                <div>
                    <h2>Off-chain Checks</h2>
                    <p>Low cost distribution of ERC-1155 tokens</p>
                    <div>Register tokens</div>
                </div>
            }
            />
            <main className='main'>
                <ERC1155Create />
            </main>
            <Footer />
        </div>
    );
};

export default ERC1155CreatePage;
