import React from "react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { handleExternalLink } from "@/utils/externalLinks";
import { useFeatureFlags } from "@/constants/featureFlags";

const Home: React.FC = () => {
  const { isBuyAlgoEnabled } = useFeatureFlags();
  
  return (
    <PageLayout>
      <div className="min-h-screen py-8 px-8 bg-gray-900 relative overflow-hidden">
        {/* 4chan-style Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(0deg, #374151 1px, transparent 1px),
              linear-gradient(90deg, #374151 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}></div>
          
          {/* Minimal floating elements */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-gray-600 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-1 h-1 bg-gray-500 animate-bounce"></div>
          <div className="absolute bottom-40 left-1/4 w-1 h-1 bg-gray-600 animate-ping"></div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12 relative z-10">
          <div className="mb-6">
            <h1 className="text-6xl font-mono mb-4 text-gray-100 tracking-wider" style={{
              textShadow: '1px 1px 0px #000',
              fontFamily: 'monospace'
            }}>
              BLAPU
            </h1>
            <div className="w-32 h-1 bg-gray-600 mx-auto mb-4"></div>
          </div>
          <p className="text-xl text-gray-300 mb-6 font-mono tracking-wide">
            The Ultimate Algorand Memecoin
          </p>
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            <Badge variant="secondary" className="text-sm px-4 py-2 bg-gray-700 text-gray-200 font-mono border border-gray-600 hover:bg-gray-600 transition-all duration-300">
              ASA ID: 401752010
            </Badge>
            <Badge variant="outline" className="text-sm px-4 py-2 border border-gray-600 text-gray-300 font-mono hover:bg-gray-700 transition-all duration-300">
              Algorand Standard Asset
            </Badge>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            <div className="bg-gray-800 border border-gray-600 p-4">
              <div className="text-2xl font-bold text-gray-100 font-mono">1M</div>
              <div className="text-xs text-gray-400 font-mono">Total Supply</div>
            </div>
            <div className="bg-gray-800 border border-gray-600 p-4">
              <div className="text-2xl font-bold text-gray-100 font-mono">0%</div>
              <div className="text-xs text-gray-400 font-mono">Team Tokens</div>
            </div>
            <div className="bg-gray-800 border border-gray-600 p-4">
              <div className="text-2xl font-bold text-gray-100 font-mono">∞</div>
              <div className="text-xs text-gray-400 font-mono">Potential</div>
            </div>
          </div>
        </div>

        {/* Tokenomics Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="border border-gray-600 bg-gray-800 hover:bg-gray-700 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl text-gray-100 font-mono">
                Tokenomics
              </CardTitle>
              <CardDescription className="text-gray-400 font-mono">
                Fair launch with immutable supply
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-700 border border-gray-500">
                <span className="font-bold text-gray-200 font-mono">Total Supply:</span>
                <span className="text-lg font-bold text-gray-100 font-mono">
                  1,000,000 BLAPU
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 border border-gray-500">
                <span className="font-bold text-gray-200 font-mono">Token Type:</span>
                <Badge variant="secondary" className="bg-green-900 text-green-200 font-mono border border-green-700">Immutable ASA</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 border border-gray-500">
                <span className="font-bold text-gray-200 font-mono">Launch Type:</span>
                <Badge variant="outline" className="border-green-600 text-green-300 font-mono">Fair Launch</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700 border border-gray-500">
                <span className="font-bold text-gray-200 font-mono">Team Tokens:</span>
                <Badge variant="destructive" className="bg-red-900 text-red-200 font-mono border border-red-700">None</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-600 bg-gray-800 hover:bg-gray-700 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl text-gray-100 font-mono">
                Roadmap
              </CardTitle>
              <CardDescription className="text-gray-400 font-mono">Simple and effective phases</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-gray-700 border border-gray-500">
                <div className="w-8 h-8 bg-gray-600 flex items-center justify-center text-white font-bold text-sm font-mono border border-gray-500">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-gray-200 text-sm font-mono">Phase 1: Meme</h4>
                  <p className="text-xs text-gray-400 font-mono">
                    Community building and meme creation
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-gray-700 border border-gray-500">
                <div className="w-8 h-8 bg-gray-600 flex items-center justify-center text-white font-bold text-sm font-mono border border-gray-500">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-gray-200 text-sm font-mono">Phase 2: Vibe and HODL</h4>
                  <p className="text-xs text-gray-400 font-mono">
                    Community engagement and holding
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-gray-700 border border-gray-500">
                <div className="w-8 h-8 bg-gray-600 flex items-center justify-center text-white font-bold text-sm font-mono border border-gray-500">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-gray-200 text-sm font-mono">Phase 3: Meme Takeover</h4>
                  <p className="text-xs text-gray-400 font-mono">
                    Dominance in the meme space
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to Buy Section */}
        <Card className="mb-8 border border-gray-600 bg-gray-800 hover:bg-gray-700 transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl text-gray-100 font-mono">
              How to Buy BLAPU
            </CardTitle>
            <CardDescription className="text-gray-400 font-mono">Step-by-step guide for new users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 bg-gray-700 border border-gray-500">
                <h4 className="font-bold text-gray-200 text-sm font-mono">
                  Step 1: Get Pera Wallet
                </h4>
                <p className="text-xs text-gray-400 font-mono">
                  Download Pera Wallet from your app store
                </p>
                <button
                  onClick={() => {
                    console.log('Pera Wallet clicked');
                    window.open('https://perawallet.app/', '_blank', 'noopener,noreferrer');
                  }}
                  className="link-button text-blue-400 hover:text-blue-300 font-mono text-xs underline cursor-pointer transition-all duration-200 hover:scale-105 hover:font-semibold px-2 py-1 rounded hover:bg-blue-400/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50 inline-block"
                  style={{
                    pointerEvents: 'auto',
                    userSelect: 'text',
                    cursor: 'pointer',
                    zIndex: 10,
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 8px'
                  }}
                >
                  perawallet.app
                </button>
              </div>
              <div className="space-y-4 p-4 bg-gray-700 border border-gray-500">
                <h4 className="font-bold text-gray-200 text-sm font-mono">
                  Step 2: Fund with ALGO
                </h4>
                <p className="text-xs text-gray-400 font-mono">
                  {isBuyAlgoEnabled() && "Buy ALGO from Coinbase, Binance, or Kraken"}
                </p>
              </div>
              <div className="space-y-4 p-4 bg-gray-700 border border-gray-500">
                <h4 className="font-bold text-gray-200 text-sm font-mono">Step 3: Use DEX</h4>
                <p className="text-xs text-gray-400 font-mono">Connect to Vestige or Pact.fi</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      console.log('Vestige Swap clicked');
                      window.open('https://vestige.fi/asset/401752010', '_blank', 'noopener,noreferrer');
                    }}
                    className="link-button text-blue-400 hover:text-blue-300 font-mono text-xs underline cursor-pointer transition-all duration-200 hover:scale-105 hover:font-semibold px-2 py-1 rounded hover:bg-blue-400/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50 inline-block"
                    style={{
                      pointerEvents: 'auto',
                      userSelect: 'text',
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 8px'
                    }}
                  >
                    Vestige Swap
                  </button>
                  <button
                    onClick={() => {
                      console.log('PactFi Swap clicked');
                      window.open('https://app.pact.fi/swap?direct=true&pair=ALGO%3A0%2FBLAPU%3A401752010%28100%2CCONSTv201%29', '_blank', 'noopener,noreferrer');
                    }}
                    className="link-button text-blue-400 hover:text-blue-300 font-mono text-xs underline cursor-pointer transition-all duration-200 hover:scale-105 hover:font-semibold px-2 py-1 rounded hover:bg-blue-400/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50 inline-block"
                    style={{
                      pointerEvents: 'auto',
                      userSelect: 'text',
                      cursor: 'pointer',
                      zIndex: 10,
                      position: 'relative',
                      background: 'transparent',
                      border: 'none',
                      padding: '4px 8px'
                    }}
                  >
                    PactFi Swap
                  </button>
                </div>
              </div>
              <div className="space-y-4 p-4 bg-gray-700 border border-gray-500">
                <h4 className="font-bold text-gray-200 text-sm font-mono">
                  Step 4: Swap ALGO for BLAPU
                </h4>
                <p className="text-xs text-gray-400 font-mono">Use ASA ID: 401752010</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Community Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="text-center border border-gray-600 bg-gray-800 hover:bg-gray-700 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-gray-100 text-lg font-mono">
                Community Driven
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-400 font-mono">
                No team tokens, no presale, fair launch for everyone
              </p>
            </CardContent>
          </Card>
          <Card className="text-center border border-gray-600 bg-gray-800 hover:bg-gray-700 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-gray-100 text-lg font-mono">Algorand Native</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-400 font-mono">
                Built on Algorand for fast, cheap, and secure transactions
              </p>
            </CardContent>
          </Card>
          <Card className="text-center border border-gray-600 bg-gray-800 hover:bg-gray-700 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-gray-100 text-lg font-mono">Immutable Supply</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-400 font-mono">
                Fixed supply of 1M tokens, no inflation ever
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Button 
            onClick={() => handleExternalLink('https://t.me/BlapuGANG2', 'Telegram Community')}
            className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-mono text-sm px-6 py-3 border border-gray-500 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-gray-500/25"
          >
            JOIN THE BLAPU REVOLUTION
          </Button>
        </div>

        {/* 4chan-style footer */}
        <div className="mt-12 text-center text-xs text-gray-500 font-mono">
          <p>BLAPU - The Ultimate Algorand Memecoin</p>
          <p className="mt-2">ASA ID: 401752010 | Fair Launch | No Team Tokens</p>
          <p className="mt-2">Built on Algorand | Immutable Supply | Community Driven</p>
        </div>
      </div>
    </PageLayout>
  );
};

export default Home;
