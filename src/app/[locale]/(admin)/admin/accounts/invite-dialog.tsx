"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Dialog, InlineAlert, Input, Select } from "@/components/ui";
import { Icon } from "@/components/icon";
import { inviteMemberAction, type InviteFormState } from "@/server/accounts";

const INIT: InviteFormState = { status: "idle" };
const ROLES = ["CLIENT", "EDITOR", "APPROVER", "SUPER_ADMIN"] as const;

/** SUPER_ADMIN-only "invite member" dialog. Creates an INVITED account and emails
 * a set-password link; the page only renders this for super admins. */
export function InviteMemberDialog({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const tActions = useTranslations("Actions");
  const tRoles = useTranslations("Roles");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(inviteMemberAction, INIT);
  const fe = state.fieldErrors ?? {};

  // On success, refresh so the new INVITED row appears, then close shortly after.
  React.useEffect(() => {
    if (state.status === "success") {
      router.refresh();
      const id = setTimeout(() => setOpen(false), 1400);
      return () => clearTimeout(id);
    }
  }, [state.status, router]);

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        leadingIcon={<Icon name="user-plus" size={15} />}
        onClick={() => setOpen(true)}
      >
        {tActions("invite")}
      </Button>

      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        title={t("inviteTitle")}
        description={t("inviteSubtitle")}
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {tActions("cancel")}
            </Button>
            <Button
              type="submit"
              form="invite-form"
              variant="primary"
              loading={pending}
              leadingIcon={<Icon name="user-plus" size={15} />}
            >
              {t("inviteSubmit")}
            </Button>
          </>
        }
      >
        <form id="invite-form" action={action} className="flex flex-col gap-[14px]">
          <input type="hidden" name="locale" value={locale} />
          <Input label={t("inviteFieldName")} name="name" required error={fe.name} />
          <Input
            label={t("inviteFieldEmail")}
            name="email"
            type="email"
            required
            error={fe.email}
          />
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            <Select label={t("inviteFieldRole")} name="role" defaultValue="CLIENT" required>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {tRoles(r)}
                </option>
              ))}
            </Select>
            <Input label={t("inviteFieldOrg")} name="organization" />
          </div>
          {state.status === "error" && state.message && (
            <InlineAlert>{state.message}</InlineAlert>
          )}
          {state.status === "success" && state.message && (
            <InlineAlert tone="success" icon="check-circle">
              {state.message}
            </InlineAlert>
          )}
        </form>
      </Dialog>
    </>
  );
}
