import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { handleExternalLink } from '@/utils/externalLinks';

const BlapuAssets: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 scanlines">
      {/* Blapu Logo */}
      <Card className="pixelated hover:animate-pixelate">
        <CardHeader>
          <CardTitle className="text-[#ff6600] font-8bit uppercase tracking-wider">BLAPU LOGO</CardTitle>
        </CardHeader>
        <CardContent>
          <img src="/blapu-logo.svg" alt="Blapu Logo" className="w-full h-auto pixelated" />
        </CardContent>
      </Card>

      {/* Blapu Moon */}
      <Card className="pixelated hover:animate-pixelate">
        <CardHeader>
          <CardTitle className="text-[#ff6600] font-8bit uppercase tracking-wider">TO THE MOON</CardTitle>
        </CardHeader>
        <CardContent>
          <img src="/blapu-moon.svg" alt="Blapu Moon" className="w-full h-auto pixelated" />
        </CardContent>
      </Card>

      {/* Blapu Lambo */}
      <Card className="pixelated hover:animate-pixelate">
        <CardHeader>
          <CardTitle className="text-[#ff6600] font-8bit uppercase tracking-wider">LAMBO DREAMS</CardTitle>
        </CardHeader>
        <CardContent>
          <img src="/blapu-lambo.svg" alt="Blapu Lambo" className="w-full h-auto pixelated" />
        </CardContent>
      </Card>

      {/* Blapu Roadmap */}
      <Card className="pixelated hover:animate-pixelate">
        <CardHeader>
          <CardTitle className="text-[#ff6600] font-8bit uppercase tracking-wider">ROADMAP</CardTitle>
        </CardHeader>
        <CardContent>
          <img src="/blapu-roadmap.svg" alt="Blapu Roadmap" className="w-full h-auto pixelated" />
        </CardContent>
      </Card>

      {/* Blapu Tokenomics */}
      <Card className="pixelated hover:animate-pixelate">
        <CardHeader>
          <CardTitle className="text-[#ff6600] font-8bit uppercase tracking-wider">TOKENOMICS</CardTitle>
        </CardHeader>
        <CardContent>
          <img src="/blapu-tokenomics.svg" alt="Blapu Tokenomics" className="w-full h-auto pixelated" />
        </CardContent>
      </Card>

      {/* Blapu Info */}
      <Card className="pixelated hover:animate-pixelate">
        <CardHeader>
          <CardTitle className="text-[#ff6600] font-8bit uppercase tracking-wider">BLAPU INFO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-8bit">
          <div className="text-sm">
            <strong className="text-[#ff6600]">ASA ID:</strong> <span className="text-[#ff6600]">401752010</span>
          </div>
          <div className="text-sm">
            <strong className="text-[#ff6600]">TOTAL SUPPLY:</strong> <span className="text-[#ff6600]">1,000,000 BLAPU</span>
          </div>
          <div className="text-sm">
            <strong className="text-[#ff6600]">NETWORK:</strong> <span className="text-[#ff6600]">ALGORAND</span>
          </div>
          <div className="text-sm">
            <strong className="text-[#ff6600]">BUY ON:</strong> <span className="text-[#ff6600]">VESTIGE.FI</span>
          </div>
          <div className="text-sm">
            <strong className="text-[#ff6600]">COMMUNITY:</strong> 
            <button 
              onClick={() => handleExternalLink('https://blapu.biz', 'BLAPU.BIZ')}
              className="text-[#ff6600] border-b-2 border-[#ff6600] hover:bg-[#ff6600] hover:text-black cursor-pointer"
            >
              BLAPU.BIZ
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlapuAssets; 