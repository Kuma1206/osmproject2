import React from "react";
import { Tabs, TabList, Tab, TabPanel } from "react-tabs";
import styles from "./style.module.scss";
import "react-tabs/style/react-tabs.css";
import Odaiidhiran_copy from "@/components/Odaiichiran_copy";
import Shinarioichiran from "@/components/Shinarioichiran";
import Afurecoichiran from "@/components/Afurecoichiran";

const Shinki = () => {
  return (
    <div className={styles.mainbox}>
      <div className={styles.tabmenu}>
        <Tabs>
          <div className={styles.submenubox}>
            <TabList className={styles.tabbox}>
              <Tab
                className={styles.menubox}
                selectedClassName={styles.selectedTab}
              >
                恋愛
              </Tab>
              <Tab
                className={styles.menubox}
                selectedClassName={styles.selectedTab}
              >
                SF  
              </Tab>
              <Tab
                className={styles.menubox}
                selectedClassName={styles.selectedTab}
              >
                スポーツ
              </Tab>
              <Tab
                className={styles.menubox}
                selectedClassName={styles.selectedTab}
              >
                戦争
              </Tab>
              <Tab
                className={styles.menubox}
                selectedClassName={styles.selectedTab}
              >
                ホラー
              </Tab>{" "}
              <Tab
                className={styles.menubox}
                selectedClassName={styles.selectedTab}
              >
                アクション
              </Tab>
            </TabList>
          </div>

          <TabPanel>
            <div>
              <Odaiidhiran_copy />
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
