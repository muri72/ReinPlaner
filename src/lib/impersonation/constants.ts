export const IMPERSONATION_STORAGE_KEY = "ReinPlaner.impersonation.meta";

export interface ImpersonationMeta {
  sessionId: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string | null;
  impersonatedUserId: string;
  impersonatedName: string;
  impersonatedRole: string;
  startedAt: string;
}