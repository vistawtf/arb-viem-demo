import { createPublicClient, http } from 'viem';
import { arbitrum, arbitrumSepolia } from 'viem/chains';
import { timeboostPublicActions } from 'arb-viem';

export const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http('https://arbitrum.drpc.org'),
}).extend(timeboostPublicActions);

export const arbitrumSepoliaClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http('https://arbitrum-sepolia.gateway.tenderly.co'),
}).extend(timeboostPublicActions);

export const clients = {
  [arbitrum.id]: arbitrumClient,
  [arbitrumSepolia.id]: arbitrumSepoliaClient,
} as const; 