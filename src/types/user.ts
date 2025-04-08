import { User as PrismaUser, Role, User } from '@prisma/client';

// Tipo extendido de usuario que incluye el rol
export interface UserWithRole extends User {
    role?: Role;
    roleName?: string;
  }