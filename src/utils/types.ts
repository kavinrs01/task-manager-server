import { Role } from '@prisma/client';

interface CurrentAuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

export type { CurrentAuthUser };
