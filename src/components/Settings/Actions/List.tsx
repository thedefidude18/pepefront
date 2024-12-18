import Loader from "@components/Shared/Loader";
import { QueueListIcon } from "@heroicons/react/24/outline";
import { POLYGONSCAN_URL } from "@hey/data/constants";
import formatDate from "@hey/helpers/datetime/formatDate";
import formatAddress from "@hey/helpers/formatAddress";
import type { ProfileActionHistoryRequest } from "@hey/lens";
import { LimitType, useProfileActionHistoryQuery } from "@hey/lens";
import { EmptyState, ErrorMessage } from "@hey/ui";
import Link from "next/link";
import type { FC } from "react";
import { Virtuoso } from "react-virtuoso";
import { useAccountStore } from "src/store/persisted/useAccountStore";

const List: FC = () => {
  const { currentAccount } = useAccountStore();

  const request: ProfileActionHistoryRequest = { limit: LimitType.TwentyFive };
  const { data, error, fetchMore, loading } = useProfileActionHistoryQuery({
    skip: !currentAccount?.id,
    variables: { request }
  });

  const profileActionHistory = data?.profileActionHistory?.items;
  const pageInfo = data?.profileActionHistory?.pageInfo;
  const hasMore = pageInfo?.next;

  const onEndReached = async () => {
    if (hasMore) {
      await fetchMore({
        variables: { request: { ...request, cursor: pageInfo?.next } }
      });
    }
  };

  if (loading) {
    return <Loader className="py-10" />;
  }

  if (error) {
    return (
      <ErrorMessage error={error} title="Failed to load profile actions" />
    );
  }

  if (profileActionHistory?.length === 0) {
    return (
      <EmptyState
        hideCard
        icon={<QueueListIcon className="size-8" />}
        message="You have no actions on your account!"
      />
    );
  }

  return (
    <Virtuoso
      className="virtual-divider-list-window"
      computeItemKey={(index, action) => `${action.id}-${index}`}
      data={profileActionHistory}
      endReached={onEndReached}
      itemContent={(_, action) => (
        <div className="space-y-1 p-5">
          <b>{action.actionType.toLowerCase()}</b>
          <div className="ld-text-gray-500 text-sm">
            {action.txHash ? (
              <span>
                <span>Hash: </span>
                <Link
                  className="hover:underline"
                  href={`${POLYGONSCAN_URL}/tx/${action.txHash}`}
                  target="_blank"
                >
                  {action.txHash.slice(0, 8 + 2)}…
                  {action.txHash.slice(action.txHash.length - 8)}
                </Link>
                <span className="mx-2 border-l dark:border-gray-700" />
              </span>
            ) : null}
            {action.who ? (
              <span>
                <span>Acted by: </span>
                <Link
                  className="hover:underline"
                  href={`${POLYGONSCAN_URL}/address/${action.who}`}
                  target="_blank"
                >
                  {formatAddress(action.who)}
                </Link>
                <span className="mx-2 border-l dark:border-gray-700" />
              </span>
            ) : null}
            {formatDate(action.actionedOn, "MMM D, YYYY - hh:mm:ss A")}
          </div>
        </div>
      )}
      useWindowScroll
    />
  );
};

export default List;
