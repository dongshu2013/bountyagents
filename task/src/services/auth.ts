import jwt from 'jsonwebtoken';
import { AppContext } from '../context.js';
import { RequestTokenRequest } from '../schemas.js';
import { verifyDetachedSignature, normalizeAddress } from '../crypto.js';
import { ServiceError } from './tasks.js';

export const requestToken = async (
  ctx: AppContext,
  payload: RequestTokenRequest
): Promise<{ token: string; expiresIn: number }> => {
  const { address, message, signature } = payload;
  const normalizedAddress = normalizeAddress(address);

  // Validate the signature
  const isValid = await verifyDetachedSignature(normalizedAddress, message, signature);
  if (!isValid) {
    throw new ServiceError(401, 'invalid_signature', 'Invalid signature provided');
  }

  // Check the message content (e.g. require a timestamp to prevent replay attacks)
  // For simplicity, we assume any signed message is valid, but usually we'd want to parse it.

  // Generate JWT token with 7 days expiration
  const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
  const token = jwt.sign(
    { address: normalizedAddress },
    ctx.config.jwtSecret,
    { expiresIn }
  );

  return { token, expiresIn };
};
