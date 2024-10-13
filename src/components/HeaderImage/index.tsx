import React from "react";
import styles from "./style.module.scss";

const HeaderImage = () => {
  return (
    <div className={styles.headerimage}>
      <video className={styles.video} autoPlay muted loop>
        <source src="/videos/ヘッダー動画.mp4" type="video/mp4" />
      </video>
      <p className={styles.title}>
        日本の<br/>
        アマチュアクリエイターで
        世界を変える
      </p>
    </div>
  );
};

export default HeaderImage;
