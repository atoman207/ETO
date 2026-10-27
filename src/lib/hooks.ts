"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { ROLE_PERMISSIONS } from "./constants";
import type { Permission, User } from "./types";

export function can(user: User | undefined, perm: Permission) {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role].includes(perm);
}

export function useCurrentUser() {
  const users = useStore((s) => s.users);
  const id = useStore((s) => s.currentUserId);
  return useMemo(() => users.find((u) => u.id === id) ?? users[0], [users, id]);
}

export function useCan(perm: Permission) {
  const user = useCurrentUser();
  return can(user, perm);
}

export function useLookups() {
  const users = useStore((s) => s.users);
  const customers = useStore((s) => s.customers);
  const sites = useStore((s) => s.sites);
  const suppliers = useStore((s) => s.suppliers);
  const cases = useStore((s) => s.cases);
  const equipment = useStore((s) => s.equipment);
  return useMemo(
    () => ({
      user: new Map(users.map((u) => [u.id, u])),
      customer: new Map(customers.map((c) => [c.id, c])),
      site: new Map(sites.map((s) => [s.id, s])),
      supplier: new Map(suppliers.map((s) => [s.id, s])),
      case: new Map(cases.map((c) => [c.id, c])),
      equipment: new Map(equipment.map((e) => [e.id, e])),
    }),
    [users, customers, sites, suppliers, cases, equipment],
  );
}
