import { useState, useEffect } from 'react';
import { type TvlInfo, type BiddingTokenInfo, type ExpressLaneController } from 'arb-viem';
import { formatEther } from 'viem';
import { arbitrumClient } from '../lib/client';

type NetworkInfo = TvlInfo & BiddingTokenInfo & {
  hasActiveController: ExpressLaneController['isActiveController'];
  expressLaneDelay: number;
  regularTransactionDelay: number;
};

interface Props {
  client: typeof arbitrumClient;
  chainName: string;
}

const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function NetworkMetrics({ client, chainName }: Props) {
  const [metrics, setMetrics] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tvl, biddingToken, controller] = await Promise.all([
          client.getTvl(),
          client.getBiddingToken(),
          client.getExpressLaneController(),
        ]);
        
        const networkMetrics: NetworkInfo = {
          ...tvl,
          ...biddingToken,
          hasActiveController: controller.isActiveController,
          expressLaneDelay: 500, 
          regularTransactionDelay: 1500,
        };

        setMetrics(networkMetrics);
        setIsInitialLoad(false);
      } catch (err) {
        console.error('Error fetching network metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, [client, chainName]);

  return (
    <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-4 h-full">
      <div className="border-b border-[#3a3a3a] pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-light text-white tracking-wide">NETWORK METRICS</h2>
            <p className="mono text-[#6a6a6a] text-xs mt-0.5">{chainName}</p>
          </div>
        </div>
      </div>
      
      <div>
        {isInitialLoad && loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[#ff5233] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="mono text-[#6a6a6a] text-xs">LOADING...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-red-400">
              <div className="text-2xl mb-3">⚠</div>
              <p className="mono text-sm font-medium">ERROR</p>
              <p className="mono text-[#6a6a6a] text-xs mt-2 max-w-xs break-words">{error}</p>
            </div>
          </div>
        ) : metrics ? (
          <div className="space-y-3">
            {/* Delay metrics in compact grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                <span className="mono text-green-400 text-xs tracking-wider block mb-1">EXPRESS LANE</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono font-light text-green-400">{metrics.expressLaneDelay}ms</span>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full data-pulse"></div>
                </div>
              </div>

              <div className={`rounded p-3 border ${
                metrics.hasActiveController 
                  ? 'bg-[#ff5233]/10 border-[#ff5233]/30' 
                  : 'bg-[#4a4a4a]/10 border-[#4a4a4a]/30'
              }`}>
                <span className={`mono text-xs tracking-wider block mb-1 ${
                  metrics.hasActiveController ? 'text-[#ff5233]' : 'text-[#aaaaaa]'
                }`}>REGULAR TXS</span>
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-mono font-light ${
                    metrics.hasActiveController ? 'text-[#ff5233]' : 'text-[#aaaaaa]'
                  }`}>
                    {metrics.regularTransactionDelay}ms
                  </span>
                  {metrics.hasActiveController && (
                    <div className="w-1.5 h-1.5 bg-[#ff5233] rounded-full data-pulse"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Combined TVL and Status */}
            <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="mono text-[#aaaaaa] text-xs tracking-wider">TOTAL VALUE LOCKED</span>
                <span className={`px-2 py-0.5 rounded border text-xs mono font-medium ${
                  metrics.hasActiveController 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : 'bg-[#4a4a4a]/20 text-[#aaaaaa] border-[#4a4a4a]/30'
                }`}>
                  › {metrics.hasActiveController ? 'ACTIVE' : 'NO CONTROLLER'}
                </span>
              </div>
              <div className="text-lg font-mono font-light text-[#ff5233] mb-1">
                {parseFloat(formatEther(metrics.totalValueLocked)).toFixed(4)} ETH
              </div>
              {metrics.beneficiaryBalance > 0n && (
                <div className="mono text-xs text-[#6a6a6a]">
                  › Beneficiary: {parseFloat(formatEther(metrics.beneficiaryBalance)).toFixed(4)} ETH
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                <div className="mono text-[#6a6a6a] text-xs tracking-wider mb-1">BIDDING TOKEN</div>
                <div className="mono text-xs text-[#ff5233]">
                  {formatAddress(metrics.biddingToken)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-[#6a6a6a]">
              <div className="text-2xl mb-3">◦</div>
              <p className="mono text-xs">NO DATA AVAILABLE</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 