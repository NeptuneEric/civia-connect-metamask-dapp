import type { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const ERC1155Pack = dynamic(import('../components/ERC1155Pack'), { ssr: false });
const Header = dynamic(import('../components/Header'), { ssr: false });
const Footer = dynamic(import('../components/Footer'), { ssr: false });

const ERC1155PackPage: NextPage = () => {
    return (
        <div>
            <Head>
                <title>Bundle checks</title>
                <link rel="icon" href="/civia-icon.svg" />
            </Head>
            <Header title={
                <div>
                    <h2>Off-chain Checks</h2>
                    <p>Low cost distribution of ERC-1155 tokens</p>
                    <div>Bundle checks</div>
                </div>
            }
            />
            <main className='main'>
                <ERC1155Pack />
            </main>
            <Footer />
        </div>
    );
};

export default ERC1155PackPage;
