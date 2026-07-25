// Type augmentation for NextAuth session to include username + id
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  }
}
