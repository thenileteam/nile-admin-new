// Modal component for changing or upgrading a platform user's role
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { upgradeUserToAdmin } from "@/api/admins";
import { errorMessage } from "@/api/client";
import { modifyPlatformUser, type PlatformUser } from "@/api/ops";
import { Button, Field, Modal, Select } from "@/components/ui";

interface RoleModalProps {
  user: PlatformUser | null;
  onClose: () => void;
}

export const RoleModal = ({ user, onClose }: RoleModalProps) => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>(user?.role ?? "ADMIN");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const userId = user.id ?? user._id;

      // If upgrading to admin or superadmin, use the dedicated upgrade endpoint
      if (selectedRole === "ADMIN" || selectedRole === "SUPERADMIN") {
        return upgradeUserToAdmin({
          userId: userId || undefined,
          email: user.email,
          role: selectedRole as "ADMIN" | "SUPERADMIN",
        });
      }

      // Otherwise, modify the user role directly
      if (!userId) {
        throw new Error("User ID is missing");
      }
      return modifyPlatformUser(userId, { role: selectedRole });
    },
    onSuccess: () => {
      toast.success(`User role updated to ${selectedRole}`);
      void queryClient.invalidateQueries({ queryKey: ["platform-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admins"] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!user) return null;

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title="Change user role"
      description={`Update platform permissions for ${displayName}`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="rounded-md bg-ink-50 p-3 text-xs text-ink-700">
          <p className="font-medium text-ink-900">{displayName}</p>
          <p className="text-ink-500">{user.email}</p>
          <p className="mt-1">
            Current role: <span className="font-semibold text-ink-900">{user.role}</span>
          </p>
        </div>

        <Field label="New role" hint="Select the new role to assign to this account">
          <Select
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
          >
            <option value="ADMIN">ADMIN — console access</option>
            <option value="SUPERADMIN">SUPERADMIN — manage admins and system</option>
            <option value="STORE_OWNER">STORE_OWNER — merchant store owner</option>
            <option value="USER">USER — standard customer</option>
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Update role
          </Button>
        </div>
      </form>
    </Modal>
  );
};
