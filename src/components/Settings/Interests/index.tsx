import MetaTags from "@components/Common/MetaTags";
import Interests from "@components/Settings/Interests/Interests";
import Beta from "@components/Shared/Badges/Beta";
import NotLoggedIn from "@components/Shared/NotLoggedIn";
import { Leafwatch } from "@helpers/leafwatch";
import { APP_NAME } from "@hey/data/constants";
import { PAGEVIEW } from "@hey/data/tracking";
import {
  Card,
  CardHeader,
  GridItemEight,
  GridItemFour,
  GridLayout,
  H5
} from "@hey/ui";
import type { NextPage } from "next";
import { useEffect } from "react";
import { useAccountStore } from "src/store/persisted/useAccountStore";
import SettingsSidebar from "../Sidebar";

const InterestsSettings: NextPage = () => {
  const { currentAccount } = useAccountStore();

  useEffect(() => {
    Leafwatch.track(PAGEVIEW, { page: "settings", subpage: "interests" });
  }, []);

  if (!currentAccount) {
    return <NotLoggedIn />;
  }

  return (
    <GridLayout>
      <MetaTags title={`Interests settings • ${APP_NAME}`} />
      <GridItemFour>
        <SettingsSidebar />
      </GridItemFour>
      <GridItemEight>
        <Card>
          <CardHeader
            body={`Interests you select are used to personalize your experience
            across ${APP_NAME}. You can adjust your interests if something
            doesn't look right.`}
            title={
              <div className="flex items-center space-x-2">
                <H5>Select profile interests</H5>
                <Beta />
              </div>
            }
          />
          <Interests />
        </Card>
      </GridItemEight>
    </GridLayout>
  );
};

export default InterestsSettings;
