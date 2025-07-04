import { useState } from 'react';
import { arbitrumClient } from '../lib/client';

interface Props {
  client: typeof arbitrumClient;
  chainName: string;
}

export function TimeboostedTxsComponent({ client, chainName }: Props) {
  const [blockNumber, setBlockNumber] = useState('');
  const [txHashes, setTxHashes] = useState<readonly `0x${string}`[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockNumber.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const block = await client.getBlock({
        blockNumber: BigInt(blockNumber)
      });
      
      const hashes = await client.getTimeboostedTxHashes({
        blockHash: block.hash
      });
      setTxHashes(hashes);
    } catch (err) {
      console.error('Error fetching timeboosted transactions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setTxHashes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 h-full flex flex-col">
      <div className="border-b border-gray-100 pb-2 mb-3">
        <h2 className="text-lg font-bold text-gray-900">Timeboosted Transactions</h2>
        <p className="text-sm text-gray-600">{chainName}</p>
      </div>
      
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="flex gap-2">
          <input
            type="number"
            value={blockNumber}
            onChange={(e) => setBlockNumber(e.target.value)}
            placeholder="Block number"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !blockNumber.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Searching...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-600">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="text-sm font-medium">Error</p>
              <p className="text-xs text-gray-600 mt-1">{error}</p>
            </div>
          </div>
        ) : txHashes.length > 0 ? (
          <div className="h-full overflow-y-auto">
            <p className="text-sm text-gray-600 mb-2">
              Found {txHashes.length} timeboosted transaction{txHashes.length !== 1 ? 's' : ''}:
            </p>
            <div className="space-y-1">
              {txHashes.map((hash, index) => (
                <div key={hash} className="bg-gray-50 border border-gray-200 rounded p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">#{index + 1}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(hash)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs font-mono text-gray-800 break-all mt-1">
                    {hash}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : blockNumber && !loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-2xl mb-2">🔍</div>
              <p className="text-sm">No timeboosted transactions found</p>
              <p className="text-xs text-gray-400 mt-1">Block {blockNumber}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-2xl mb-2">🔍</div>
              <p className="text-sm">Enter a block number to search</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 