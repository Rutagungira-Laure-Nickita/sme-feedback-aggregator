export type VerifiedGoogleIdentity = {
  sub: string;
  email: string;
  emailVerified: true;
  givenName?: string;
  familyName?: string;
  name?: string;
  picture?: string;
};
