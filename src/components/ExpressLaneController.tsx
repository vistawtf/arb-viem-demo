import { useState, useEffect, useRef } from 'react';
import { type ExpressLaneController } from '../../../src/actions';
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

const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function ExpressLaneController({ client, chainName }: Props) {
  const [controller, setController] = useState<ExpressLaneController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number | null>(null);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    const fetchController = async () => {
      setLoading(true);
      setError(null);
      try {
        const controllerInfo = await client.getExpressLaneController();
        setController(controllerInfo);
        setIsInitialLoad(false);
      } catch (err) {
        console.error('Error fetching express lane controller:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchController();
    const interval = setInterval(fetchController, 5000);
    return () => clearInterval(interval);
  }, [client, chainName]);

  useEffect(() => {
    if (!controller || !controller.currentController) {
      setLocalTimeRemaining(null);
      return;
    }

    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    
    if (!localTimeRemaining || timeSinceLastSync > 3000 || Math.abs(localTimeRemaining - controller.timeRemainingInRound) > 2) {
      setLocalTimeRemaining(controller.timeRemainingInRound);
    }
    
    lastSyncTimeRef.current = now;
  }, [controller]);

  useEffect(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (localTimeRemaining !== null && localTimeRemaining > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setLocalTimeRemaining(prev => {
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
  }, [localTimeRemaining !== null]);

  return (
    <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-4 h-full">
      <div className="border-b border-[#3a3a3a] pb-3 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-light text-white tracking-wide">EXPRESS LANE CONTROLLER</h2>
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
        ) : controller ? (
          <div className="space-y-3">
            {controller.currentController ? (
              <>
                <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="mono text-[#aaaaaa] text-xs tracking-wider">CONTROLLER ADDRESS</span>
                    <span className={`px-2 py-0.5 rounded border text-xs mono font-medium ${
                      controller.isActiveController 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'bg-[#4a4a4a]/20 text-[#aaaaaa] border-[#4a4a4a]/30'
                    }`}>
                      › {controller.isActiveController ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="mono text-sm text-[#ff5233] break-all">
                    {formatAddress(controller.currentController)}
                  </div>
                </div>

                <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                  <div className="flex justify-between">
                    <div>
                      <span className="mono text-[#aaaaaa] text-xs tracking-wider">
                        ROUND #{controller.controllerForRound.toString()}
                      </span>
                      <div className="mono text-[#6a6a6a] text-xs mt-1">
                        › Current round duration: 60 seconds
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="mono text-[#6a6a6a] text-xs">
                        TIME REMAINING
                      </span>
                      <div className="text-lg font-mono font-light text-[#ff5233] mt-1">
                        {formatTime(localTimeRemaining ?? controller.timeRemainingInRound)}
                      </div>
                    </div>
                  </div>
                </div>

                {controller.hasTransferor && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                    <div className="flex items-center mb-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 data-pulse"></div>
                      <span className="mono text-blue-400 text-xs tracking-wider">TRANSFEROR SET</span>
                    </div>
                    <div className="mono text-sm text-blue-400">
                      {controller.transferor && formatAddress(controller.transferor)}
                    </div>
                    {controller.transferorFixedUntilRound && (
                      <div className="mono text-xs text-blue-400/70 mt-1">
                        › Fixed until round {controller.transferorFixedUntilRound.toString()}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                    <div className="mono text-[#6a6a6a] text-xs tracking-wider mb-1">ROUND START</div>
                    <div className="mono text-xs text-white">
                      {new Date(controller.roundStartTime * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="bg-[#2a2a2a] border border-[#4a4a4a] rounded p-3">
                    <div className="mono text-[#6a6a6a] text-xs tracking-wider mb-1">ROUND END</div>
                    <div className="mono text-xs text-white">
                      {new Date(controller.roundEndTime * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-center text-[#6a6a6a]">
                  <div className="text-3xl mb-3">◦</div>
                  <p className="mono text-sm font-medium">NO ACTIVE CONTROLLER</p>
                  <p className="mono text-xs mt-2">
                    › No controller for round {controller.controllerForRound.toString()}
                  </p>
                </div>
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