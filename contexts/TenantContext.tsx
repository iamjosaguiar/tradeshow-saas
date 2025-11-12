/**
 * Tenant Context Provider
 * Provides tenant information throughout the application
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface TenantBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  darkColor: string;
  accentColor: string | null;
}

interface TenantContextType {
  tenantId: number | null;
  tenantSubdomain: string | null;
  branding: TenantBranding | null;
  isLoading: boolean;
}

const defaultBranding: TenantBranding = {
  name: 'TradeShow SaaS',
  logoUrl: null,
  primaryColor: '#1BD076',
  darkColor: '#042D23',
  accentColor: null,
};

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  tenantSubdomain: null,
  branding: defaultBranding,
  isLoading: true,
});

interface TenantProviderProps {
  children: ReactNode;
  initialBranding?: TenantBranding;
}

export function TenantProvider({ children, initialBranding }: TenantProviderProps) {
  const { data: session, status } = useSession();

  const tenantId = session?.user?.tenantId || null;
  const tenantSubdomain = session?.user?.tenantSubdomain || null;
  const branding = initialBranding || defaultBranding;
  const isLoading = status === 'loading';

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantSubdomain,
        branding,
        isLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to access tenant context
 */
export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }

  return context;
}

/**
 * Hook to access tenant branding
 */
export function useTenantBranding() {
  const { branding } = useTenant();
  return branding;
}

/**
 * Hook to check if user belongs to a specific tenant
 */
export function useIsTenant(subdomain: string) {
  const { tenantSubdomain } = useTenant();
  return tenantSubdomain === subdomain;
}

/**
 * Hook to require tenant (throws error if no tenant)
 */
export function useRequireTenant() {
  const { tenantId, tenantSubdomain, isLoading } = useTenant();

  if (!isLoading && !tenantId) {
    throw new Error('Tenant is required but not found');
  }

  return { tenantId, tenantSubdomain, isLoading };
}
