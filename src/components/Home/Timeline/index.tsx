import QueuedPost from "@components/Post/QueuedPost";
import SinglePost from "@components/Post/SinglePost";
import PostsShimmer from "@components/Shared/Shimmer/PostsShimmer";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { HEY_CURATED_ID } from "@hey/data/constants";
import type { AnyPublication, FeedItem, FeedRequest } from "@hey/lens";
import { FeedEventItemType, useFeedQuery } from "@hey/lens";
import { OptmisticPostType } from "@hey/types/enums";
import { Card, EmptyState, ErrorMessage } from "@hey/ui";
import type { FC } from "react";
import { memo, useRef } from "react";
import type { StateSnapshot, VirtuosoHandle } from "react-virtuoso";
import { Virtuoso } from "react-virtuoso";
import { useImpressionsStore } from "src/store/non-persisted/useImpressionsStore";
import { useTipsStore } from "src/store/non-persisted/useTipsStore";
import { useAccountStore } from "src/store/persisted/useAccountStore";
import { useTransactionStore } from "src/store/persisted/useTransactionStore";

let virtuosoState: any = { ranges: [], screenTop: 0 };

const Timeline: FC = () => {
  const { currentAccount, fallbackToCuratedFeed } = useAccountStore();
  const { txnQueue } = useTransactionStore();
  const { fetchAndStoreViews } = useImpressionsStore();
  const { fetchAndStoreTips } = useTipsStore();
  const virtuoso = useRef<VirtuosoHandle>(null);

  const request: FeedRequest = {
    where: {
      feedEventItemTypes: [
        FeedEventItemType.Post,
        FeedEventItemType.Mirror,
        FeedEventItemType.Quote
      ],
      for: fallbackToCuratedFeed ? HEY_CURATED_ID : currentAccount?.id
    }
  };

  const { data, error, fetchMore, loading } = useFeedQuery({
    fetchPolicy: "cache-and-network",
    onCompleted: async ({ feed }) => {
      const ids =
        feed?.items?.flatMap((p) => {
          return [p.root.id].filter((id) => id);
        }) || [];
      await fetchAndStoreViews(ids);
      await fetchAndStoreTips(ids);
    },
    variables: { request }
  });

  const feed = data?.feed?.items.filter(
    (item) => item.root.__typename !== "Comment"
  );
  const pageInfo = data?.feed?.pageInfo;
  const hasMore = pageInfo?.next;

  const onScrolling = (scrolling: boolean) => {
    if (!scrolling) {
      virtuoso?.current?.getState((state: StateSnapshot) => {
        virtuosoState = { ...state };
      });
    }
  };

  const onEndReached = async () => {
    if (hasMore) {
      const { data } = await fetchMore({
        variables: { request: { ...request, cursor: pageInfo?.next } }
      });
      const ids =
        data.feed?.items?.flatMap((p) => {
          return [p.root.id].filter((id) => id);
        }) || [];
      await fetchAndStoreViews(ids);
      await fetchAndStoreTips(ids);
    }
  };

  if (loading) {
    return <PostsShimmer />;
  }

  if (feed?.length === 0) {
    return (
      <EmptyState
        icon={<UserGroupIcon className="size-8" />}
        message="No posts yet!"
      />
    );
  }

  if (error) {
    return <ErrorMessage error={error} title="Failed to load timeline" />;
  }

  return (
    <>
      {txnQueue.map((txn) =>
        txn?.type !== OptmisticPostType.Comment ? (
          <QueuedPost key={txn.txId} txn={txn} />
        ) : null
      )}
      <Card>
        <Virtuoso
          className="virtual-divider-list-window"
          computeItemKey={(index, feedItem) => `${feedItem.id}-${index}`}
          data={feed}
          endReached={onEndReached}
          isScrolling={onScrolling}
          itemContent={(index, feedItem) => (
            <SinglePost
              feedItem={feedItem as FeedItem}
              isFirst={index === 0}
              isLast={index === (feed?.length || 0) - 1}
              post={feedItem.root as AnyPublication}
            />
          )}
          ref={virtuoso}
          restoreStateFrom={
            virtuosoState.ranges.length === 0
              ? virtuosoState?.current?.getState(
                  (state: StateSnapshot) => state
                )
              : virtuosoState
          }
          useWindowScroll
        />
      </Card>
    </>
  );
};

export default memo(Timeline);
