/**
 * RoleSelector Component
 *
 * Admin-only component for changing user roles with confirmation dialog.
 * Displays all 8 roles with permission levels and handles role update mutations.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';
import { useUpdateUserRole } from '@/hooks/useApprovalMutations';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/approval';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// ============================================================================
// Constants
// ============================================================================

/**
 * Human-readable labels for user roles
 */
const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  marketing: 'Marketing',
  branding: 'Branding',
  soc_level_1: 'SOC Level 1',
  soc_level_3: 'SOC Level 3',
  ciso: 'CISO',
  admin: 'Admin',
  super_admin: 'Super Admin',
} as const;

/**
 * Ordered list of roles for display
 */
const ROLE_ORDER: readonly UserRole[] = [
  'user',
  'marketing',
  'branding',
  'soc_level_1',
  'soc_level_3',
  'ciso',
  'admin',
  'super_admin',
] as const;

// ============================================================================
// Types
// ============================================================================

export interface RoleSelectorProps {
  readonly userId: string;
  readonly currentRole: UserRole;
  readonly userName?: string;
  readonly onRoleChange?: (newRole: UserRole) => void;
  readonly disabled?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format role for display with permission level
 */
function formatRoleLabel(role: UserRole): string {
  const label = ROLE_LABELS[role];
  const level = ROLE_PERMISSIONS[role];
  return `${label} (Level ${level})`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Role selector with confirmation dialog for admin user management
 *
 * Shows dropdown with all roles, confirmation dialog with current/new role,
 * and handles the update mutation with success/error toasts.
 *
 * @example
 * ```tsx
 * <RoleSelector
 *   userId="123"
 *   currentRole="marketing"
 *   userName="John Smith"
 *   onRoleChange={(newRole) => console.log('Role changed:', newRole)}
 * />
 * ```
 */
export function RoleSelector({
  userId,
  currentRole,
  userName,
  onRoleChange,
  disabled = false,
}: RoleSelectorProps): React.ReactElement {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { mutate: updateRole, isPending } = useUpdateUserRole();

  const handleRoleSelect = useCallback((role: UserRole): void => {
    if (role === currentRole) {
      return;
    }

    setSelectedRole(role);
    setIsDialogOpen(true);
  }, [currentRole]);

  const handleDialogClose = useCallback((): void => {
    if (!isPending) {
      setIsDialogOpen(false);
      setSelectedRole(null);
    }
  }, [isPending]);

  const handleConfirm = useCallback((): void => {
    if (!selectedRole) {
      return;
    }

    updateRole(
      {
        userId,
        request: { role: selectedRole },
      },
      {
        onSuccess: () => {
          toast.success('Role updated', {
            description: `${userName || 'User'} is now ${ROLE_LABELS[selectedRole]}.`,
          });
          handleDialogClose();
          onRoleChange?.(selectedRole);
        },
        onError: (error) => {
          toast.error('Role update failed', {
            description: error.message || 'Failed to update user role. Please try again.',
          });
        },
      }
    );
  }, [userId, selectedRole, userName, updateRole, handleDialogClose, onRoleChange]);

  return (
    <>
      <Select
        value={currentRole}
        onValueChange={(value) => handleRoleSelect(value as UserRole)}
        disabled={disabled || isPending}
      >
        <SelectTrigger
          style={{
            width: 'var(--spacing-64)',
          }}
        >
          <SelectValue placeholder="Select Role">
            {formatRoleLabel(currentRole)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ROLE_ORDER.map((role) => (
            <SelectItem key={role} value={role}>
              {formatRoleLabel(role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !isPending && !open && handleDialogClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
              }}
            >
              <Shield
                style={{
                  width: 'var(--spacing-5)',
                  height: 'var(--spacing-5)',
                  color: 'var(--color-warning)',
                }}
              />
              Change User Role
            </DialogTitle>
            <DialogDescription>
              {userName ? `Change role for: ${userName}` : 'Change user role'}
            </DialogDescription>
          </DialogHeader>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
              }}
            >
              <div
                style={{
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-1)',
                  }}
                >
                  Current:
                </div>
                <div
                  style={{
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {formatRoleLabel(currentRole)}
                </div>
              </div>

              <div
                style={{
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-1)',
                  }}
                >
                  New:
                </div>
                <div
                  style={{
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {selectedRole && formatRoleLabel(selectedRole)}
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              This will update the user's permissions immediately.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              style={{
                background: 'var(--color-warning)',
                color: 'var(--color-text-on-primary)',
              }}
            >
              {isPending && (
                <Loader2
                  style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }}
                  className="animate-spin"
                />
              )}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
