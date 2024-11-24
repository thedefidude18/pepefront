import Loader from "@components/Shared/Loader";
import errorToast from "@helpers/errorToast";
import { Leafwatch } from "@helpers/leafwatch";
import { Errors } from "@hey/data/errors";
import { SETTINGS } from "@hey/data/tracking";
import getAccount from "@hey/helpers/getAccount";
import getAvatar from "@hey/helpers/getAvatar";
import type { Profile } from "@hey/lens";
import {
  useDefaultProfileQuery,
  useProfilesQuery,
  useSetDefaultProfileMutation
} from "@hey/lens";
import { Button, Card, CardHeader, Select } from "@hey/ui";
import type { FC } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccountStatus } from "src/store/non-persisted/useAccountStatus";
import { useAccountStore } from "src/store/persisted/useAccountStore";

const DefaultAccount: FC = () => {
  const { currentAccount } = useAccountStore();
  const { isSuspended } = useAccountStatus();
  const [selectedProfileId, setSelectedProfileId] = useState<null | string>(
    null
  );

  const onCompleted = () => {
    toast.success("Default profile set");
    Leafwatch.track(SETTINGS.ACCOUNT.SET_DEFAULT_PROFILE);
  };

  const onError = (error: any) => {
    errorToast(error);
  };

  const { data: profilesData, loading: profilesLoading } = useProfilesQuery({
    variables: {
      request: { where: { ownedBy: currentAccount?.ownedBy.address } }
    }
  });

  const { data: defaultProfileData, loading: defaultProfileLoading } =
    useDefaultProfileQuery({
      variables: { request: { for: currentAccount?.ownedBy.address } }
    });

  const [setProfile, { loading }] = useSetDefaultProfileMutation({
    onCompleted,
    onError
  });

  const handleSetDefaultProfile = async () => {
    if (!currentAccount) {
      return toast.error(Errors.SignWallet);
    }

    if (isSuspended) {
      return toast.error(Errors.Suspended);
    }

    try {
      return await setProfile({
        variables: { request: { profileId: selectedProfileId } }
      });
    } catch (error) {
      onError(error);
    }
  };

  if (profilesLoading || defaultProfileLoading) {
    return (
      <Card>
        <Loader className="my-10" message="Loading default profile settings" />
      </Card>
    );
  }

  const profiles = profilesData?.profiles.items as Profile[];

  return (
    <Card>
      <CardHeader
        body="Set a default profile that will be visible on places like DMs, Split Collects, and more."
        title="Set Default Profile"
      />
      <div className="m-5 space-y-4">
        <div>
          <div className="label">Select Profile</div>
          <Select
            defaultValue={defaultProfileData?.defaultProfile?.id}
            iconClassName="size-5 rounded-full border bg-gray-200 dark:border-gray-700"
            onChange={(value) => setSelectedProfileId(value)}
            options={profiles?.map((profile) => ({
              icon: getAvatar(profile),
              label: getAccount(profile).slugWithPrefix,
              selected:
                profile.id ===
                (selectedProfileId || defaultProfileData?.defaultProfile?.id),
              value: profile.id
            }))}
          />
        </div>
        <div className="flex">
          <Button
            className="ml-auto"
            disabled={loading}
            onClick={handleSetDefaultProfile}
            type="submit"
          >
            Set Default Profile
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DefaultAccount;
