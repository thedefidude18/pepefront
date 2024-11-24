import IndexStatus from "@components/Shared/IndexStatus";
import LazySmallSingleAccount from "@components/Shared/LazySmallSingleAccount";
import Loader from "@components/Shared/Loader";
import Slug from "@components/Shared/Slug";
import errorToast from "@helpers/errorToast";
import { Leafwatch } from "@helpers/leafwatch";
import { AtSymbolIcon } from "@heroicons/react/24/outline";
import { TokenHandleRegistry } from "@hey/abis";
import { TOKEN_HANDLE_REGISTRY } from "@hey/data/constants";
import { Errors } from "@hey/data/errors";
import { SETTINGS } from "@hey/data/tracking";
import checkDispatcherPermissions from "@hey/helpers/checkDispatcherPermissions";
import getSignature from "@hey/helpers/getSignature";
import type { LinkHandleToProfileRequest } from "@hey/lens";
import {
  useBroadcastOnchainMutation,
  useCreateLinkHandleToProfileTypedDataMutation,
  useLinkHandleToProfileMutation,
  useOwnedHandlesQuery
} from "@hey/lens";
import { Button, EmptyState } from "@hey/ui";
import type { FC } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import useHandleWrongNetwork from "src/hooks/useHandleWrongNetwork";
import { useAccountStatus } from "src/store/non-persisted/useAccountStatus";
import { useNonceStore } from "src/store/non-persisted/useNonceStore";
import { useAccountStore } from "src/store/persisted/useAccountStore";
import { useSignTypedData, useWriteContract } from "wagmi";

const LinkHandle: FC = () => {
  const { currentAccount } = useAccountStore();
  const { isSuspended } = useAccountStatus();
  const { incrementLensHubOnchainSigNonce, lensHubOnchainSigNonce } =
    useNonceStore();
  const [linkingHandle, setLinkingHandle] = useState<null | string>(null);

  const handleWrongNetwork = useHandleWrongNetwork();
  const { canBroadcast, canUseLensManager } =
    checkDispatcherPermissions(currentAccount);

  const onCompleted = (
    __typename?: "LensProfileManagerRelayError" | "RelayError" | "RelaySuccess"
  ) => {
    if (
      __typename === "RelayError" ||
      __typename === "LensProfileManagerRelayError"
    ) {
      return;
    }

    setLinkingHandle(null);
    toast.success("Handle linked");
    Leafwatch.track(SETTINGS.HANDLE.LINK);
  };

  const onError = (error: any) => {
    setLinkingHandle(null);
    errorToast(error);
  };

  const { data, loading } = useOwnedHandlesQuery({
    variables: { request: { for: currentAccount?.ownedBy.address } }
  });

  const { signTypedDataAsync } = useSignTypedData({ mutation: { onError } });
  const { data: writeHash, writeContractAsync } = useWriteContract({
    mutation: { onError, onSuccess: () => onCompleted() }
  });

  const write = async ({ args }: { args: any[] }) => {
    return await writeContractAsync({
      abi: TokenHandleRegistry,
      address: TOKEN_HANDLE_REGISTRY,
      args,
      functionName: "link"
    });
  };

  const [broadcastOnchain, { data: broadcastData }] =
    useBroadcastOnchainMutation({
      onCompleted: ({ broadcastOnchain }) =>
        onCompleted(broadcastOnchain.__typename)
    });

  const [createLinkHandleToProfileTypedData] =
    useCreateLinkHandleToProfileTypedDataMutation({
      onCompleted: async ({ createLinkHandleToProfileTypedData }) => {
        const { id, typedData } = createLinkHandleToProfileTypedData;
        const signature = await signTypedDataAsync(getSignature(typedData));
        await handleWrongNetwork();
        incrementLensHubOnchainSigNonce();

        if (canBroadcast) {
          const { data } = await broadcastOnchain({
            variables: { request: { id, signature } }
          });
          if (data?.broadcastOnchain.__typename === "RelayError") {
            return await write({ args: [typedData.value] });
          }

          return;
        }

        return await write({ args: [typedData.value] });
      },
      onError
    });

  const [linkHandleToProfile, { data: linkHandleToProfileData }] =
    useLinkHandleToProfileMutation({
      onCompleted: ({ linkHandleToProfile }) =>
        onCompleted(linkHandleToProfile.__typename),
      onError
    });

  const linkHandleToProfileViaLensManager = async (
    request: LinkHandleToProfileRequest
  ) => {
    const { data } = await linkHandleToProfile({ variables: { request } });

    if (
      data?.linkHandleToProfile.__typename === "LensProfileManagerRelayError"
    ) {
      return await createLinkHandleToProfileTypedData({
        variables: { request }
      });
    }
  };

  const handleLink = async (handle: string) => {
    if (!currentAccount) {
      return;
    }

    if (isSuspended) {
      return toast.error(Errors.Suspended);
    }

    const confirmation = confirm("Are you sure you want to link this handle?");

    if (!confirmation) {
      return;
    }

    try {
      setLinkingHandle(handle);
      const request: LinkHandleToProfileRequest = { handle };

      if (canUseLensManager) {
        return await linkHandleToProfileViaLensManager(request);
      }

      return await createLinkHandleToProfileTypedData({
        variables: {
          options: { overrideSigNonce: lensHubOnchainSigNonce },
          request
        }
      });
    } catch (error) {
      onError(error);
    }
  };

  if (loading) {
    return <Loader className="py-10" />;
  }

  const ownedHandles = data?.ownedHandles.items.filter(
    (handle) => handle.linkedTo?.nftTokenId !== currentAccount?.id
  );

  if (!ownedHandles?.length) {
    return (
      <EmptyState
        hideCard
        icon={<AtSymbolIcon className="size-8" />}
        message="No handles found to link!"
      />
    );
  }

  const lensManegaerTxId =
    linkHandleToProfileData?.linkHandleToProfile.__typename ===
      "RelaySuccess" && linkHandleToProfileData.linkHandleToProfile.txId;
  const broadcastTxId =
    broadcastData?.broadcastOnchain.__typename === "RelaySuccess" &&
    broadcastData.broadcastOnchain.txId;

  return (
    <div className="m-5 space-y-6">
      {ownedHandles?.map((handle) => (
        <div
          className="flex flex-wrap items-center justify-between gap-3"
          key={handle.fullHandle}
        >
          <div className="flex items-center space-x-2">
            <Slug className="font-bold" slug={handle.fullHandle} />
            {handle.linkedTo ? (
              <div className="flex items-center space-x-2">
                <span>·</span>
                <div>Linked to</div>
                <LazySmallSingleAccount id={handle.linkedTo?.nftTokenId} />
              </div>
            ) : null}
          </div>
          {lensManegaerTxId || broadcastTxId || writeHash ? (
            <div className="mt-2">
              <IndexStatus
                shouldReload
                txHash={writeHash}
                txId={lensManegaerTxId || broadcastTxId}
              />
            </div>
          ) : (
            <Button
              disabled={linkingHandle === handle.fullHandle}
              onClick={() => handleLink(handle.fullHandle)}
              outline
            >
              {handle.linkedTo ? "Unlink and Link" : "Link"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default LinkHandle;
