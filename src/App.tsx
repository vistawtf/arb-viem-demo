import { useState, useEffect, useRef } from 'react'
import { arbitrumClient, arbitrumSepoliaClient } from './lib/client'
import { StreamTimeboostedTxsComponent } from './components/StreamTimeboostedTxs'
import { AuctionStatus } from './components/AuctionStatus'
import { ExpressLaneController } from './components/ExpressLaneController'
import { NetworkMetrics } from './components/NetworkMetrics'
import './App.css'

type Chain = 'arbitrum' | 'arbitrum-sepolia'

function NoiseBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const chars = ['█', '▓', '▒', '░', '▄', '▀', '■', '▪', '▫', '·']
    const fontSize = 8
    const columns = Math.floor(canvas.width / fontSize)
    const rows = Math.floor(canvas.height / fontSize)

    const noise = new Array(columns * rows).fill(0).map(() => ({
      char: chars[Math.floor(Math.random() * chars.length)],
      opacity: Math.random() * 0.3,
      decay: Math.random() * 0.01 + 0.005
    }))

    const animate = () => {
      ctx.fillStyle = '#111111'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.font = `${fontSize}px 'Geist Mono', monospace`
      
      for (let i = 0; i < noise.length; i++) {
        const x = (i % columns) * fontSize
        const y = Math.floor(i / columns) * fontSize
        
        noise[i].opacity -= noise[i].decay
        if (noise[i].opacity <= 0) {
          noise[i] = {
            char: chars[Math.floor(Math.random() * chars.length)],
            opacity: Math.random() * 0.3,
            decay: Math.random() * 0.01 + 0.005
          }
        }
        
        ctx.fillStyle = `rgba(255, 82, 51, ${noise[i].opacity})`
        ctx.fillText(noise[i].char, x, y)
      }
      
      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} id="noise-canvas" />
}

function App() {
  const [selectedChain, setSelectedChain] = useState<Chain>('arbitrum')
  
  const client = selectedChain === 'arbitrum' ? arbitrumClient : arbitrumSepoliaClient
  const chainName = selectedChain === 'arbitrum' ? 'Arbitrum One' : 'Arbitrum Sepolia'

  return (
    <>
      <NoiseBackground />
      <div className="min-h-screen w-full flex flex-col bg-[#111111] text-white">
        <header className="flex-shrink-0 bg-[#1a1a1a] border-b border-[#3a3a3a] px-4 py-6">
            <div className="text-center space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white leading-none">
                TIMEBOOST
                <span className="block text-[#ff5233] font-mono text-lg md:text-xl tracking-wider mt-2">
                  › REAL-TIME AUCTION MONITORING
                </span>
              </h1>
              <p className="mono text-[#aaaaaa] text-sm max-w-2xl mx-auto leading-relaxed">
                Live monitoring of express lane auctions, controllers, and network metrics
              </p>
              
              <div className="flex gap-4 justify-center items-center pt-4">
                <label className="flex items-center gap-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] px-4 py-3 rounded border border-[#4a4a4a] cursor-pointer vista-transition group">
                  <input
                    type="radio"
                    value="arbitrum-sepolia"
                    checked={selectedChain === 'arbitrum-sepolia'}
                    onChange={(e) => setSelectedChain(e.target.value as Chain)}
                    className="w-4 h-4 accent-[#ff5233]"
                  />
                  <span className="mono text-sm group-hover:text-[#ff5233] vista-transition">
                    ARB SEPOLIA › TESTNET
                  </span>
                </label>
                <label className="flex items-center gap-3 bg-[#2a2a2a] hover:bg-[#3a3a3a] px-4 py-3 rounded border border-[#4a4a4a] cursor-pointer vista-transition group">
                  <input
                    type="radio"
                    value="arbitrum"
                    checked={selectedChain === 'arbitrum'}
                    onChange={(e) => setSelectedChain(e.target.value as Chain)}
                    className="w-4 h-4 accent-[#ff5233]"
                  />
                  <span className="mono text-sm group-hover:text-[#ff5233] vista-transition">
                    ARB ONE › MAINNET
                  </span>
                </label>
              </div>
            </div>
        </header>

        <main className="flex-1 p-4">
          <div className="w-full flex flex-col gap-4">
            {/* Top row - Status Cards side by side */}
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <AuctionStatus client={client} chainName={chainName} />
              </div>
              <div className="flex-1 min-w-0">
                <ExpressLaneController client={client} chainName={chainName} />
              </div>
              <div className="flex-1 min-w-0">
                <NetworkMetrics client={client} chainName={chainName} />
              </div>
            </div>
            
            {/* Bottom row - Live Transactions full width */}
            <div className="w-full">
              <StreamTimeboostedTxsComponent client={client} chainName={chainName} />
            </div>
          </div>
        </main>

        <footer className="flex-shrink-0 bg-[#1a1a1a] border-t border-[#3a3a3a] py-4 px-4">
          <div className="text-center">
            <p className="mono text-[#6a6a6a] text-xs">
              Made with <span className="text-[#ff5233]">♥</span> by{' '}
              <span className="text-[#ff5233] font-bold text-sm">vista</span>
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

export default App
