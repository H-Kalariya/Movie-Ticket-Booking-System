// Role-based access control definitions.
// - customer: browse catalogue, book/cancel their own seats, manage their profile.
// - theatre_owner: manage ONLY the theatres they own (screens, shows, prices) and
//   view/cancel bookings for shows on their screens.
// - admin: full control over everything, including user roles and the activity log.
export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  THEATRE_OWNER: 'theatre_owner',
  ADMIN: 'admin',
});

export const ALL_ROLES = Object.values(ROLES);

// Capability flags, grouped per role. Routes check capabilities (not raw role
// strings) so permissions stay readable and easy to extend.
export const CAPABILITIES = Object.freeze({
  [ROLES.CUSTOMER]: ['booking:create', 'booking:read:own', 'booking:cancel:own', 'profile:manage'],
  [ROLES.THEATRE_OWNER]: [
    'profile:manage',
    'theatre:manage:own',
    'screen:manage:own',
    'show:manage:own',
    'movie:read',
    'booking:read:own-theatre',
    'booking:cancel:own-theatre',
  ],
  [ROLES.ADMIN]: ['*'],
});

export function can(role, capability) {
  const caps = CAPABILITIES[role] || [];
  return caps.includes('*') || caps.includes(capability);
}
