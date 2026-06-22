import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

// @Roles(UserRole.ADMIN, ...) — required global roles for a route.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// @Public() — marks a route as not requiring authentication.
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
}

// @CurrentUser() — injects the authenticated user (set by JwtAuthGuard).
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    return ctx.switchToHttp().getRequest().user;
  },
);
