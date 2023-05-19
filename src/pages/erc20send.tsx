import { useEffect, useState, ChangeEvent, useRef } from "react";
import type { NextPage } from "next";
import Head from "next/head"
import dynamic from 'next/dynamic';
import { Button, Input, message, Steps, Spin, Form, Select } from 'antd';
import { useContractRead, useContractWrite, useConnect, useAccount, useSignMessage } from 'wagmi';
import { getContract, getWalletClient, readContract, writeContract } from '@wagmi/core'
//import { getFollowingList } from '../services/account.service';

import CiviaERC20Check from '../../abi/CiviaERC20Check.json';
import TestToken from '../../abi/TestToken.json';

import styles from "../styles/erc20send.module.css"

const ERC20Send = dynamic(import('../components/ERC20Send'), { ssr: false });
const Header = dynamic(import('../components/Header'), { ssr: false });
const Footer = dynamic(import('../components/Footer'), { ssr: false });

const CIVIA_ERC20_CONTRACT_ADDRESS = '0x4C1b4A6DD7968DcF3C1b7b5DC5d89B5e4085a2F8';


const Erc20Send: NextPage = () => {
    

  return (
    <div>
        <Head>
          <title>Send Token</title>
          <link rel="icon" href="/civia-icon.svg" />
        </Head>
          <Header title='Send Token'  />
          <main className='main'>
            <ERC20Send />
            
        </main>
        <Footer />
    </div>
  );
};

export default Erc20Send;