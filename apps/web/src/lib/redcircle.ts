import BN from 'bn.js';
import {
  estimateBuyTokensOut,
  estimateSellSolOut,
  calculateCurrentPrice,
  calculatePriceImpactBps,
  CurveType,
} from '@redcircle-lol/protocol-sdk';

export const REDCIRCLE_TOKEN_DECIMALS = 6;
export const REDCIRCLE_TOKEN_DIVISOR = Math.pow(10, REDCIRCLE_TOKEN_DECIMALS);
const LAMPORTS_PER_SOL = 1_000_000_000;

// Shape returned by the stats endpoint when poolType === 'redcircle'
export interface RawReserves {
  virtualSolLamports: string;
  virtualTokenUnits: string;
  curveType: number;
}

function toCurveType(n: number): CurveType {
  if (n === CurveType.Linear) return CurveType.Linear;
  if (n === CurveType.Exponential) return CurveType.Exponential;
  return CurveType.ConstantProduct;
}

/**
 * Estimate tokens received for a given SOL buy (display units, fee-adjusted).
 * Returns 0 if reserves are unavailable.
 */
export function estimateBuy(reserves: RawReserves | null, solAmount: number): number {
  if (!reserves || solAmount <= 0) return 0;
  try {
    const vSol = new BN(reserves.virtualSolLamports);
    const vToken = new BN(reserves.virtualTokenUnits);
    const solLamports = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
    const tokensOut = estimateBuyTokensOut(vSol, vToken, solLamports, toCurveType(reserves.curveType));
    return tokensOut.toNumber() / REDCIRCLE_TOKEN_DIVISOR;
  } catch {
    return 0;
  }
}

/**
 * Estimate SOL received for selling a given token amount (display units, fee-adjusted).
 * Returns 0 if reserves are unavailable.
 */
export function estimateSell(reserves: RawReserves | null, tokenAmount: number): number {
  if (!reserves || tokenAmount <= 0) return 0;
  try {
    const vSol = new BN(reserves.virtualSolLamports);
    const vToken = new BN(reserves.virtualTokenUnits);
    const tokenBaseUnits = new BN(Math.floor(tokenAmount * REDCIRCLE_TOKEN_DIVISOR));
    const solOut = estimateSellSolOut(vSol, vToken, tokenBaseUnits, toCurveType(reserves.curveType));
    return solOut.toNumber() / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

/**
 * Price impact of a buy in basis points (100 bps = 1%).
 * Returns 0 if reserves unavailable or amount is 0.
 */
export function priceImpactBps(reserves: RawReserves | null, solAmount: number): number {
  if (!reserves || solAmount <= 0) return 0;
  try {
    const vSol = new BN(reserves.virtualSolLamports);
    const vToken = new BN(reserves.virtualTokenUnits);
    const solLamports = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
    return calculatePriceImpactBps(vSol, vToken, solLamports, toCurveType(reserves.curveType));
  } catch {
    return 0;
  }
}

/**
 * Current price in SOL per display token from raw reserves.
 * PRICE_PRECISION (10^9) is baked into calculateCurrentPrice return value.
 */
export function currentPriceFromReserves(reserves: RawReserves | null): number {
  if (!reserves) return 0;
  try {
    const vSol = new BN(reserves.virtualSolLamports);
    const vToken = new BN(reserves.virtualTokenUnits);
    const priceBN = calculateCurrentPrice(vSol, vToken);
    // priceBN = vSol * 10^9 / vToken (lamports * 10^9 / base-units)
    // SOL/display-token = priceBN / 10^9 / 10^9 * 10^6 = priceBN / 10^12
    return priceBN.toNumber() / 1e12;
  } catch {
    return 0;
  }
}

/** Format a number of SOL with up to 6 significant decimal places. */
export function formatSol(sol: number): string {
  if (sol === 0) return '0';
  if (sol < 0.000001) return sol.toExponential(3);
  return sol.toFixed(6).replace(/\.?0+$/, '');
}

/** Format a token amount with up to 4 decimal places. */
export function formatTokens(tokens: number): string {
  if (tokens === 0) return '0';
  if (tokens >= 1000) return tokens.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return tokens.toFixed(4).replace(/\.?0+$/, '');
}

/** Return a human-readable pool status label. */
export function formatPoolStatus(status: string | undefined): string {
  switch (status) {
    case 'active': return 'Active';
    case 'launchProtection': return 'Launch Protection';
    case 'migrated': return 'Migrated';
    case 'paused': return 'Paused';
    default: return 'Unknown';
  }
}

/** Return a Tailwind colour class for a pool status. */
export function poolStatusColour(status: string | undefined): string {
  switch (status) {
    case 'active': return 'text-green-400';
    case 'launchProtection': return 'text-yellow-400';
    case 'migrated': return 'text-blue-400';
    case 'paused': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}
