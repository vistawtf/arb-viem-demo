import { useState, useEffect, useRef } from 'react';
import { type TimeboostedTransaction } from '../../../src/actions';
import { arbitrumClient } from '../lib/client';

interface Props {
  client: typeof arbitrumClient;
  chainName: string;
}

interface TransactionWithTimestamp extends TimeboostedTransaction {
  timestamp: number;
}

export function StreamTimeboostedTxsComponent({ client, chainName }: Props) {
  const [transactions, setTransactions] = useState<TransactionWithTimestamp[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const unwatchRef = useRef<(() => Promise<void>) | null>(null);

  const startStreaming = () => {
    setIsStreaming(true);
    setError(null);
    setTransactions([]);
    setTotalCount(0);

    try {
      const { unwatch } = client.streamTimeboostedTxs({
        onTransaction: (tx) => {
          const txWithTimestamp: TransactionWithTimestamp = {
            ...tx,
            timestamp: Date.now(),
          };
          setTransactions(prev => [txWithTimestamp, ...prev.slice(0, 19)]);
          setTotalCount(prev => prev + 1);
        },
        onError: (err) => {
          console.error('Streaming error:', err);
          setError(err.message || 'Streaming error occurred');
          setIsStreaming(false);
        },
      });

      unwatchRef.current = unwatch;
    } catch (err) {
      console.error('Failed to start streaming:', err);
      setError(err instanceof Error ? err.message : 'Failed to start streaming');
      setIsStreaming(false);
    }
  };

  const stopStreaming = async () => {
    setIsStreaming(false);
    if (unwatchRef.current) {
      await unwatchRef.current();
      unwatchRef.current = null;
    }
  };

  useEffect(() => {
    const resetComponent = async () => {
      if (unwatchRef.current) {
        await unwatchRef.current();
        unwatchRef.current = null;
      }
      
      setIsStreaming(false);
      setTransactions([]);
      setTotalCount(0);
      setError(null);
    };

    resetComponent();
  }, [client, chainName]);

  useEffect(() => {
    return () => {
      if (unwatchRef.current) {
        unwatchRef.current();
      }
    };
  }, []);

  const getTimeSinceReceived = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg p-6 flex flex-col min-h-[600px]">
      <div className="flex-shrink-0 border-b border-[#3a3a3a] pb-4 mb-4">
        <h2 className="text-xl font-light text-white tracking-wide">LIVE TIMEBOOSTED TRANSACTIONS</h2>
        <p className="mono text-[#6a6a6a] text-xs mt-1">{chainName}</p>
      </div>
      
      <div className="flex-shrink-0 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={isStreaming ? stopStreaming : startStreaming}
            className={`px-4 py-2 mono text-sm font-medium rounded border vista-transition ${
              isStreaming
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30'
                : 'bg-[#ff5233]/20 hover:bg-[#ff5233]/30 text-[#ff5233] border-[#ff5233]/30'
            }`}
          >
            › {isStreaming ? 'STOP' : 'START'} STREAM
          </button>
          {isStreaming && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full data-pulse"></div>
              <span className="mono text-green-400 text-xs tracking-wider">LIVE</span>
            </div>
          )}
        </div>
        {totalCount > 0 && (
          <span className="mono text-[#6a6a6a] text-xs">
            TOTAL: {totalCount}
          </span>
        )}
      </div>

      <div className="flex-1">
        {error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-red-400">
              <div className="text-2xl mb-3">⚠</div>
              <p className="mono text-sm font-medium">ERROR</p>
              <p className="mono text-[#6a6a6a] text-xs mt-2 max-w-xs break-words">{error}</p>
            </div>
          </div>
        ) : transactions.length > 0 ? (
                     <div className="flex flex-col">
             <p className="mono text-[#6a6a6a] text-xs mb-4 tracking-wider">
               › RECENT TIMEBOOSTED TRANSACTIONS
             </p>
             <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {transactions.map((tx) => {
                const isNew = Date.now() - tx.timestamp < 3000;
                return (
                  <div 
                    key={`${tx.hash}-${tx.blockNumber}`} 
                    className={`bg-[#2a2a2a] border rounded-lg p-4 vista-transition flex-shrink-0 ${
                      isNew 
                        ? 'border-[#ff5233] bg-[#ff5233]/10 shadow-[0_0_20px_rgba(255,82,51,0.3)]' 
                        : 'border-[#4a4a4a] hover:border-[#6a6a6a]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="mono text-[#aaaaaa] text-xs tracking-wider">
                        BLOCK #{tx.blockNumber.toString()}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="mono text-[#6a6a6a] text-xs">
                          {getTimeSinceReceived(tx.timestamp)}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(tx.hash)}
                          className="mono text-[#ff5233] hover:text-white text-xs vista-transition"
                          title="Copy hash"
                        >
                          › COPY
                        </button>
                      </div>
                    </div>
                    <p className="mono text-sm text-[#ff5233] break-all mb-3">
                      {tx.hash}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="mono text-[#6a6a6a] text-xs">
                        TX INDEX: {tx.transactionIndex}
                      </span>
                      {isNew && (
                        <span className="mono text-xs bg-[#ff5233]/20 text-[#ff5233] px-2 py-1 rounded border border-[#ff5233]/30 data-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : isStreaming ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-[#6a6a6a]">
              <div className="text-2xl mb-3">◦</div>
              <p className="mono text-xs">WATCHING FOR TIMEBOOSTED TRANSACTIONS...</p>
              <div className="flex items-center justify-center gap-1 mt-4">
                <div className="w-1 h-1 bg-[#ff5233] rounded-full data-pulse"></div>
                <div className="w-1 h-1 bg-[#ff5233] rounded-full data-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-1 h-1 bg-[#ff5233] rounded-full data-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-[#6a6a6a]">
              <div className="text-2xl mb-3">◦</div>
              <p className="mono text-xs">CLICK "START STREAM" TO WATCH LIVE</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 