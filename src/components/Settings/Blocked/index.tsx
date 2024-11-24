import MetaTags from "@components/Common/MetaTags";
import NotLoggedIn from "@components/Shared/NotLoggedIn";
import { Leafwatch } from "@helpers/leafwatch";
import { APP_NAME } from "@hey/data/constants";
import { PAGEVIEW } from "@hey/data/tracking";
import {
  Card,
  CardHeader,
  GridItemEight,
  GridItemFour,
  GridLayout
} from "@hey/ui";
import type { NextPage } from "next";
import { useEffect } from "react";
import { useAccountStore } from "src/store/persisted/useAccountStore";
import SettingsSidebar from "../Sidebar";
import List from "./List";

const BlockedSettings: NextPage = () => {
  const { currentAccount } = useAccountStore();

  useEffect(() => {
    Leafwatch.track(PAGEVIEW, { page: "settings", subpage: "blocked" });
  }, []);

  if (!currentAccount) {
    return <NotLoggedIn />;
  }

  return (
    <GridLayout>
      <MetaTags title={`Blocked profiles • ${APP_NAME}`} />
      <GridItemFour>
        <SettingsSidebar />
      </GridItemFour>
      <GridItemEight>
        <Card>
          <CardHeader
            body="This is a list of blocked profiles. You can unblock them at any time."
            title="Blocked profiles"
          />
          <List />
        </Card>
      </GridItemEight>
    </GridLayout>
  );
};

export default BlockedSettings;
