import React from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import styles from "./style.module.scss";
import "react-tabs/style/react-tabs.css";
import Shinki from "@/components/Shinki";
import Dougaichiran from "@/components/Dougaichiran";
import Ichijihozon from "@/components/Ichijihozon";

const Tab3 = () => {
  return (
    <div className={styles.tabmenu}>
      <Tabs>
        <div className={styles.tabstyle}>
          <TabList className={styles.tabbox}>
            <Tab className={styles.menubox}>My library</Tab>
            <Tab className={styles.menubox}>New</Tab>
            <Tab className={styles.menubox}>keep</Tab>
          </TabList>
        </div>

        <TabPanel>
          <div>
            <Dougaichiran />
          </div>{" "}
        </TabPanel>
        <TabPanel>
          <div>
            <Shinki />
          </div>
        </TabPanel>
        <TabPanel>
          <div>
            <Ichijihozon />
          </div>{" "}
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default Tab3;
