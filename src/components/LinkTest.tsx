import React from 'react';
import { handleExternalLink } from '@/utils/externalLinks';

const LinkTest: React.FC = () => {
  const testLinks = [
    { url: 'https://perawallet.app/', name: 'Pera Wallet' },
    { url: 'https://vestige.fi/asset/401752010', name: 'Vestige Swap' },
    { url: 'https://t.me/BlapuGANG2', name: 'Telegram Community' },
    { url: 'https://blapu.biz', name: 'BLAPU.BIZ' },
    { url: 'https://app.pact.fi', name: 'Pact' },
    { url: 'https://app.humble.sh', name: 'Humble' },
  ];

  return (
    <div className="p-8 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-6">External Link Test</h2>
      <div className="space-y-4">
        {testLinks.map((link, index) => (
          <div key={index} className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
            <span className="text-gray-300">{link.name}:</span>
            <button
              onClick={() => handleExternalLink(link.url, link.name)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-mono text-sm"
            >
              Test Link
            </button>
            <span className="text-gray-400 text-sm font-mono">{link.url}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Instructions:</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Click each "Test Link" button to test external link functionality</li>
          <li>• Links should open in new tabs</li>
          <li>• If popup is blocked, URL will be copied to clipboard</li>
          <li>• Check browser console for click logging</li>
        </ul>
      </div>
    </div>
  );
};

export default LinkTest; 