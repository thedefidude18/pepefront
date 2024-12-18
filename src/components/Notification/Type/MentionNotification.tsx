import Markup from "@components/Shared/Markup";
import { AtSymbolIcon } from "@heroicons/react/24/outline";
import getPostData from "@hey/helpers/getPostData";
import type { MentionNotification as TMirrorNotification } from "@hey/lens";
import Link from "next/link";
import type { FC } from "react";
import usePushToImpressions from "src/hooks/usePushToImpressions";
import { NotificationAccountAvatar } from "../Account";
import AggregatedNotificationTitle from "../AggregatedNotificationTitle";

interface MentionNotificationProps {
  notification: TMirrorNotification;
}

const MentionNotification: FC<MentionNotificationProps> = ({
  notification
}) => {
  const metadata = notification?.publication.metadata;
  const filteredContent = getPostData(metadata)?.content || "";
  const firstAccount = notification.publication.by;

  const text = "mentioned you in a";
  const type = notification.publication.__typename;

  usePushToImpressions(notification.publication.id);

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        <AtSymbolIcon className="size-6" />
        <div className="flex items-center space-x-1">
          <NotificationAccountAvatar account={firstAccount} />
        </div>
      </div>
      <div className="ml-9">
        <AggregatedNotificationTitle
          firstAccount={firstAccount}
          linkToType={`/posts/${notification?.publication?.id}`}
          text={text}
          type={type}
        />
        <Link
          className="ld-text-gray-500 linkify mt-2 line-clamp-2"
          href={`/posts/${notification?.publication?.id}`}
        >
          <Markup mentions={notification?.publication.profilesMentioned}>
            {filteredContent}
          </Markup>
        </Link>
      </div>
    </div>
  );
};

export default MentionNotification;
