import Loader from "@components/Shared/Loader";
import { DEFAULT_COLLECT_TOKEN, STATIC_IMAGES_URL } from "@hey/data/constants";
import allowedOpenActionModules from "@hey/helpers/allowedOpenActionModules";
import {
  FollowModuleType,
  useApprovedModuleAllowanceAmountQuery
} from "@hey/lens";
import { CardHeader, ErrorMessage, Select } from "@hey/ui";
import type { FC } from "react";
import { useState } from "react";
import { useAccountStore } from "src/store/persisted/useAccountStore";
import { useAllowedTokensStore } from "src/store/persisted/useAllowedTokensStore";
import Allowance from "./Allowance";

const getAllowancePayload = (currency: string) => {
  return {
    currencies: [currency],
    followModules: [FollowModuleType.FeeFollowModule],
    openActionModules: allowedOpenActionModules
  };
};

const CollectModules: FC = () => {
  const { currentAccount } = useAccountStore();
  const { allowedTokens } = useAllowedTokensStore();
  const [selectedCurrency, setSelectedCurrency] = useState(
    DEFAULT_COLLECT_TOKEN
  );
  const [currencyLoading, setCurrencyLoading] = useState(false);

  const { data, error, loading, refetch } =
    useApprovedModuleAllowanceAmountQuery({
      fetchPolicy: "no-cache",
      skip: !currentAccount?.id,
      variables: { request: getAllowancePayload(DEFAULT_COLLECT_TOKEN) }
    });

  if (error) {
    return (
      <ErrorMessage
        className="mt-5"
        error={error}
        title="Failed to load data"
      />
    );
  }

  return (
    <div>
      <CardHeader
        body="In order to use collect feature you need to allow the module you
            use, you can allow and revoke the module anytime."
        title="Allow / revoke follow or collect modules"
      />
      <div className="m-5">
        <div className="label">Select currency</div>
        <Select
          iconClassName="size-4"
          onChange={(value) => {
            setCurrencyLoading(true);
            setSelectedCurrency(value);
            refetch({
              request: getAllowancePayload(value)
            }).finally(() => setCurrencyLoading(false));
          }}
          options={
            allowedTokens?.map((token) => ({
              icon: `${STATIC_IMAGES_URL}/tokens/${token.symbol}.svg`,
              label: token.name,
              selected: token.contractAddress === selectedCurrency,
              value: token.contractAddress
            })) || [{ label: "Loading...", value: "Loading..." }]
          }
        />
        {loading || currencyLoading ? (
          <Loader className="py-10" />
        ) : (
          <Allowance allowance={data} />
        )}
      </div>
    </div>
  );
};

export default CollectModules;
