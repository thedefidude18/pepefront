import errorToast from "@helpers/errorToast";
import { Leafwatch } from "@helpers/leafwatch";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { Errors } from "@hey/data/errors";
import { ACCOUNT } from "@hey/data/tracking";
import getAccount from "@hey/helpers/getAccount";
import getAvatar from "@hey/helpers/getAvatar";
import getLennyURL from "@hey/helpers/getLennyURL";
import type {
  LastLoggedInProfileRequest,
  Profile,
  ProfilesManagedRequest
} from "@hey/lens";
import {
  ManagedProfileVisibility,
  useAuthenticateMutation,
  useChallengeLazyQuery,
  useProfilesManagedQuery
} from "@hey/lens";
import { ErrorMessage, H4, Image, Spinner } from "@hey/ui";
import cn from "@hey/ui/cn";
import { useRouter } from "next/router";
import type { FC } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAccountStore } from "src/store/persisted/useAccountStore";
import { signIn, signOut } from "src/store/persisted/useAuthStore";
import { useAccount, useSignMessage } from "wagmi";
import WalletSelector from "./Auth/WalletSelector";
import Loader from "./Loader";

const SwitchAccounts: FC = () => {
  const { reload } = useRouter();
  const { currentAccount } = useAccountStore();
  const [isLoading, setIsLoading] = useState(false);
  const [loggingInProfileId, setLoggingInProfileId] = useState<null | string>(
    null
  );
  const { address } = useAccount();

  const onError = (error: any) => {
    setIsLoading(false);
    errorToast(error);
  };

  const { signMessageAsync } = useSignMessage({ mutation: { onError } });

  const lastLoggedInProfileRequest: LastLoggedInProfileRequest = {
    for: address
  };

  const profilesManagedRequest: ProfilesManagedRequest = {
    for: address,
    hiddenFilter: ManagedProfileVisibility.NoneHidden
  };

  const { data, error, loading } = useProfilesManagedQuery({
    variables: { lastLoggedInProfileRequest, profilesManagedRequest }
  });
  const [loadChallenge] = useChallengeLazyQuery({
    fetchPolicy: "no-cache"
  });
  const [authenticate] = useAuthenticateMutation();

  if (loading) {
    return <Loader className="my-5" message="Loading Profiles" />;
  }

  const profiles = data?.profilesManaged.items || [];

  const handleSwitchProfile = async (id: string) => {
    try {
      setLoggingInProfileId(id);
      setIsLoading(true);
      // Get challenge
      const challenge = await loadChallenge({
        variables: { request: { for: id, signedBy: address } }
      });

      if (!challenge?.data?.challenge?.text) {
        return toast.error(Errors.SomethingWentWrong);
      }

      // Get signature
      const signature = await signMessageAsync({
        message: challenge?.data?.challenge?.text
      });

      // Auth profile and set cookies
      const auth = await authenticate({
        variables: { request: { id: challenge.data.challenge.id, signature } }
      });
      const accessToken = auth.data?.authenticate.accessToken;
      const refreshToken = auth.data?.authenticate.refreshToken;
      const identityToken = auth.data?.authenticate.identityToken;
      signOut();
      signIn({ accessToken, identityToken, refreshToken });
      Leafwatch.track(ACCOUNT.SWITCH_ACCOUNT, { accountId: id });
      reload();
    } catch (error) {
      onError(error);
    }
  };

  if (!address) {
    return (
      <div className="m-5 space-y-5">
        <div className="space-y-2">
          <H4>Connect your wallet.</H4>
          <div className="ld-text-gray-500 text-sm">
            Seems like you are disconnected from the wallet or trying to access
            this from a different wallet. Please switch to the correct wallet.
          </div>
        </div>
        <WalletSelector />
      </div>
    );
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto p-2">
      <ErrorMessage
        className="m-2"
        error={error}
        title="Failed to load profiles"
      />
      {profiles.map((profile, index) => (
        <button
          className="flex w-full cursor-pointer items-center justify-between space-x-2 rounded-lg py-3 pr-4 pl-3 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          key={profile?.id}
          onClick={async () => {
            const selectedProfile = profiles[index] as Profile;
            await handleSwitchProfile(selectedProfile.id);
          }}
          type="button"
        >
          <span className="flex items-center space-x-2">
            <Image
              alt={profile.id}
              className="size-6 rounded-full border dark:border-gray-700"
              height={20}
              onError={({ currentTarget }) => {
                currentTarget.src = getLennyURL(profile.id);
              }}
              src={getAvatar(profile)}
              width={20}
            />
            <div
              className={cn(
                currentAccount?.id === profile?.id && "font-bold",
                "truncate"
              )}
            >
              {getAccount(profile as Profile).slugWithPrefix}
            </div>
          </span>
          {isLoading && profile.id === loggingInProfileId ? (
            <Spinner size="xs" />
          ) : currentAccount?.id === profile?.id ? (
            <CheckCircleIcon className="size-5 text-green-500" />
          ) : null}
        </button>
      ))}
    </div>
  );
};

export default SwitchAccounts;
