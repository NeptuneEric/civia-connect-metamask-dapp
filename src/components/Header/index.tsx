import { FC, ReactElement } from 'react';
import { Image } from 'antd';

import styles from './index.module.css';

const Header: FC<{ title: ReactElement | string }> = ({ title }) => {
    return (
        <div className={styles.title}>{title}</div>
    );
};

export default Header;
