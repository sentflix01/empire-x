/**
 * apiClient.js — compatibility shim
 *
 * Some older files may still import from this path.
 * Prefer importing directly:
 *   import { auth } from '@/api/auth'
 *   import { entities } from '@/api/entities'
 */
import { auth } from './auth';
import { entities } from './entities';

// Named export kept for any file that hasn't been updated yet
export { auth, entities };
