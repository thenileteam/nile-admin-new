// Modal component for promoting an existing user to admin by email
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { upgradeUserToAdmin } from "@/api/admins";
import { errorMessage } from "@/api/client";
import type { AdminRole } from "@/auth/store";
import { Button, Field, Input, Modal, Select } from "@/components/ui";

interface UpgradeAdminModalProps {
  open: boolean;
  initialEmail?: string;
  initialRole?: AdminRole;
  onClose: () => void;
}

export const UpgradeAdminModal = ({
  open,
  initialEmail = "",
  initialRole = "ADMIN",
  onClose,
}: UpgradeAdminModalProps) => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<AdminRole>(initialRole);

  const mutation = useMutation({
    mutationFn: () => upgradeUserToAdmin({ email: email.trim().toLowerCase(), role }),
    onSuccess: (admin) => {
      toast.success(`${admin.firstName || admin.email} is now upgraded to ${role}`);
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upgrade existing user"
      description="Grant admin access to a user account that already exists on Nile"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <Field label="User email" hint="Enter the email address of the existing Nile account">
          <Input
            type="email"
            required
            placeholder="user@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Role" hint="Choose the administrative role to grant">
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value as AdminRole)}
          >
            <option value="ADMIN">ADMIN — console access</option>
            <option value="SUPERADMIN">SUPERADMIN — manage admins and system</option>
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Upgrade to {role}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
