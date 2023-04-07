import { FC } from 'react';
import { Image } from 'antd';

import styles from './index.module.css';

const Footer: FC<any> = () => {
    return (
        <div className={styles['section-footer']}>
            <div className={styles.left}>
                <Image className={styles.icon} src="https://storage.fleek.zone/c33f0f64-9add-4351-ac8c-c869d382d4f8-bucket/civia/civia-icon2.svg" alt="" />
                <Image className={styles.logo} src="https://storage.fleek.zone/c33f0f64-9add-4351-ac8c-c869d382d4f8-bucket/civia/civia-logo2.svg" alt="" />
            </div>
            <div className={styles.right}>
                <div className={styles.list}>
                    <h1>Contact Us</h1>
                    <p onClick={() => {location.href='https://civia.org/';}}>Civia.org</p>
                    {/* <p>@CIVIA</p> */}
                </div>
                {/* <div className={styles.list}>
                    <h1>Common Problem</h1>
                    <p className="cur">What is CIVIA?</p>
                    <p className="cur">What is $CIV?</p>
                </div> */}
                <div className={styles.list}>
                    <h1>Terms &amp; Agreements</h1>
                    {/* <p>Platform User Service Agreement</p>
                    <p>Privacy Term</p> */}
                </div>
            </div>
        </div>
    );
};

export default Footer;