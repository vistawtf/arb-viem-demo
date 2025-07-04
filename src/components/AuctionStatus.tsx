import { useState, useEffect, useRef } from 'react';
import { type AuctionStatus } from '../../../src/actions';
import { arbitrumClient } from '../lib/client';

interface Props {
  client: typeof arbitrumClient;
  chainName: string;
}

const formatTime = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getPhaseColor = (phase: AuctionStatus['currentPhase']) => {
  switch (phase) {
    case 'bidding': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'closing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'resolving': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'active': return 'bg-[#ff5233]/20 text-[#ff5233] border-[#ff5233]/30';
    default: return 'bg-[#4a4a4a]/20 text-[#aaaaaa] border-[#4a4a4a]/30';
  }
};

const getPhaseLabel = (phase: AuctionStatus['currentPhase']) => {
  switch (phase) {
    case 'bidding': return '› ACCEPTING BIDS';
    case 'closing': return '› AUCTION CLOSING';
    case 'resolving': return '› RESOLVING';
    case 'active': return '› ROUND ACTIVE';
    default: return '› UNKNOWN';
  }
};

export function AuctionStatus({ client, chainName }: Props) {
  const [status, setStatus] = useState<AuctionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);
  const [localRoundStartCountdown, setLocalRoundStartCountdown] = useState<number | null>(null);
  
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roundStartIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      setError(null);
      try {
        const auctionStatus = await client.getAuctionStatus();
        setStatus(auctionStatus);
        setIsInitialLoad(false);
      } catch (err) {
        console.error('Error fetching auction status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [client]);

  useEffect(() => {
    if (!status) return;

    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    
    if (status.currentPhase === 'bidding') {
      if (!localCountdown || timeSinceLastSync > 3000 || Math.abs(localCountdown - status.timeUntilAuctionCloses) > 2) {
        setLocalCountdown(status.timeUntilAuctionCloses);
      }
      setLocalRoundStartCountdown(null);
    } else if (status.currentPhase === 'closing' || status.currentPhase === 'resolving') {
      setLocalCountdown(null);
      if (!localRoundStartCountdown || timeSinceLastSync > 3000 || Math.abs(localRoundStartCountdown - status.timeUntilRoundStarts) > 2) {
        setLocalRoundStartCountdown(status.timeUntilRoundStarts);
      }
    } else {
      setLocalCountdown(null);
      setLocalRoundStartCountdown(null);
    }
    
    lastSyncTimeRef.current = now;
  }, [status]);

  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (localCountdown !== null && localCountdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setLocalCountdown(prev => {
          if (prev === null || prev <= 0) return null;
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [localCountdown !== null]);

  useEffect(() => {
    if (roundStartIntervalRef.current) {
      clearInterval(roundStartIntervalRef.current);
      roundStartIntervalRef.current = null;
    }

    if (localRoundStartCountdown !== null && localRoundStartCountdown > 0) {
      roundStartIntervalRef.current = setInterval(() => {
        setLocalRoundStartCountdown(prev => {
          if (prev === null || prev <= 0) return null;
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (roundStartIntervalRef.current) {
        clearInterval(roundStartIntervalRef.current);
        roundStartIntervalRef.current = null;
      }
    };
  }, [localRoundStartCountdown !== null]);

  return (
    <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-4 h-full">
      <div className="border-b border-[#3a3a3a] pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-light text-white tracking-wide">AUCTION STATUS</h2>
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
        ) : status ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                <span className="mono text-[#aaaaaa] text-xs tracking-wider block mb-2">CURRENT PHASE</span>
                <span className={`inline-flex items-center px-2 py-1 rounded border text-xs mono font-medium ${getPhaseColor(status.currentPhase)}`}>
                  {getPhaseLabel(status.currentPhase)}
                </span>
              </div>

              <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                <span className="mono text-[#aaaaaa] text-xs tracking-wider block mb-2">AUCTION OPEN</span>
                <span className={`inline-flex items-center px-2 py-1 rounded border text-xs mono font-medium ${
                  status.isAuctionOpen 
                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}>
                  › {status.isAuctionOpen ? 'YES' : 'NO'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                <span className="mono text-[#6a6a6a] text-xs tracking-wider block mb-1">CURRENT ROUND</span>
                <span className="text-lg font-light text-[#ff5233] mono">
                  {status.currentRound.toString()}
                </span>
              </div>

              <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                <span className="mono text-[#6a6a6a] text-xs tracking-wider block mb-1">NEXT AUCTION</span>
                <span className="text-lg font-light text-[#ff5233] mono">
                  #{status.nextAuctionRound.toString()}
                </span>
              </div>
            </div>

            {status.currentPhase === 'bidding' && localCountdown !== null && (
              <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                <span className="mono text-green-400 text-xs tracking-wider block mb-2">AUCTION CLOSES IN</span>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono font-light text-green-400">
                    {formatTime(localCountdown)}
                  </span>
                  <div className="flex-1">
                    <div className="w-full bg-green-500/20 rounded-full h-1.5">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full vista-transition"
                        style={{ 
                          width: `${Math.max(0, 100 - (localCountdown / 45) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(status.currentPhase === 'closing' || status.currentPhase === 'resolving') && localRoundStartCountdown !== null && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                <span className="mono text-blue-400 text-xs tracking-wider block mb-2">ROUND STARTS IN</span>
                <span className="text-lg font-mono font-light text-blue-400">
                  {formatTime(localRoundStartCountdown)}
                </span>
              </div>
            )}
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