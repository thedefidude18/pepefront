import errorToast from "@helpers/errorToast";
import { HeyLensSignup } from "@hey/abis";
import {
  HANDLE_PREFIX,
  HEY_LENS_SIGNUP,
  ZERO_ADDRESS
} from "@hey/data/constants";
import { Regex } from "@hey/data/regex";
import { Button, Card, CardHeader, Form, Input, useZodForm } from "@hey/ui";
import type { FC } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useWriteContract } from "wagmi";
import { object, string, type z } from "zod";

const newProfileSchema = object({
  address: string().regex(Regex.ethereumAddress),
  handle: string()
    .min(5, { message: "Handle must be at least 5 characters long" })
    .max(26, { message: "Handle must be at most 26 characters long" })
    .regex(Regex.handle)
});

const Mint: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const form = useZodForm({ mode: "onChange", schema: newProfileSchema });

  const { writeContractAsync } = useWriteContract({
    mutation: {
      onError: errorToast,
      onSuccess: (hash: string) => {
        form.reset();
        toast.success(hash);
      }
    }
  });

  const handleMint = async ({
    handle,
    address
  }: z.infer<typeof newProfileSchema>) => {
    try {
      setIsLoading(true);
      return await writeContractAsync({
        abi: HeyLensSignup,
        address: HEY_LENS_SIGNUP,
        args: [
          [address, ZERO_ADDRESS, "0x"],
          handle.toLowerCase(),
          ["0xe88E17550978A9f87819ABE96b3f9ec1edc3d953"]
        ],
        functionName: "createProfileWithHandle"
      });
    } catch (error) {
      errorToast(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Staff Mint" />
      <Form className="m-5 space-y-5" form={form} onSubmit={handleMint}>
        <Input
          placeholder="wagmi"
          prefix={`@${HANDLE_PREFIX}`}
          {...form.register("handle")}
        />
        <Input placeholder="To Address" {...form.register("address")} />
        <Button
          className="w-full justify-center"
          disabled={isLoading}
          type="submit"
        >
          Mint
        </Button>
      </Form>
    </Card>
  );
};

export default Mint;
