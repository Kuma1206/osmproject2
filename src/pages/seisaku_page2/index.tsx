import React from "react";
import Tab3 from "@/components/Tab3";
import styles from "./style.module.scss";
import Header_White from "@/components/Header_white";

const Seisaku_page2 = () => {
  return (
    <>
      <header>
        <Header_White />
      </header>

      <main className={styles.mainbox}>
        <div>
          <Tab3 />
        </div>
      </main>
    </>
  );
};

export default Seisaku_page2;
