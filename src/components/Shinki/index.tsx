import React from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import styles from "./style.module.scss";
import "react-tabs/style/react-tabs.css";
import Odaiidhiran from "@/components/Odaiichiran";
import Shinarioichiran from "@/components/Shinarioichiran";
import Afurecoichiran from "@/components/Afurecoichiran";

const Shinki = () => {
  return (
    <div className={styles.mainbox}>
      <div className={styles.tabmenu}>
        <Tabs>
          <div className={styles.submenubox}>
            <TabList className={styles.tabbox}>
              <Tab className={styles.menubox}>テーマ</Tab>
              <Tab className={styles.menubox}>シナリオ</Tab>
              <Tab className={styles.menubox}>アフレコ</Tab>
            </TabList>
          </div>

          <TabPanel>
            <div>
              <Odaiidhiran />
            </div>{" "}
          </TabPanel>
          <TabPanel>
            <div>
              <Shinarioichiran />
            </div>
          </TabPanel>
          <TabPanel>
            <div>
              <Afurecoichiran />
            </div>{" "}
          </TabPanel>
        </Tabs>
      </div>{" "}
    </div>
  );
};

export default Shinki;
