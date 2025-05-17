
import React from "react";

const features = [
  "Composable, transparent, and open BUIDL protocol for onchain work.",
  "Supports flexible bounty workflows and programmable task completion.",
  "Onchain, permissionless reputation tracking.",
  "Splittable payouts: ETH, ERC-20, and custom tokens.",
  "Onchain governance for curating projects and funding.",
  "Deep integration with L2 and alternative L1 networks.",
];

const installSteps = [
  "git clone https://github.com/NautilusOSS/buidl.git",
  "cd buidl",
  "pnpm install",
  "pnpm run dev",
];

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1F2C] via-[#131522] to-[#0c0c13] px-4 py-10">
      <div className="w-full max-w-3xl glass-morphism rounded-3xl shadow-2xl p-8 md:p-14 mb-10">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <img
            src="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=320&q=80"
            alt="Project Screenshot"
            className="rounded-2xl w-full max-w-[180px] shadow-lg object-cover"
          />
          <div className="flex-1">
            <h1 className="text-gradient-primary text-4xl font-extrabold mb-2 drop-shadow-xl">
              Nautilus BUIDL Protocol
            </h1>
            <p className="text-white/85 text-lg mb-3">
              <span className="font-bold">Composable Onchain Work Protocol</span>
              <br />
              BUIDL is an open, modular protocol for flexible bounties, onchain work, and decentralized collaboration. It enables communities to recognize, coordinate, and reward onchain value-creation transparently and verifiably.
            </p>
            <div className="text-sm text-[#9b87f5] mb-2">
              <span className="font-bold">GitHub:</span>{" "}
              <a href="https://github.com/NautilusOSS/buidl" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1EAEDB]">
                NautilusOSS/buidl
              </a>
            </div>
          </div>
        </div>

        <hr className="my-7 border-white/10" />

        <section>
          <h2 className="text-2xl font-bold mb-3 text-white">Key Features</h2>
          <ul className="list-disc pl-6 text-white/90 space-y-1">
            {features.map((feature, idx) => (
              <li key={idx}>{feature}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-3 text-white">Getting Started</h2>
          <div className="bg-[#232534e8] rounded-xl shadow-inner p-5 mb-5 border border-white/10">
            <div className="font-semibold text-pink-200 mb-2">Clone & Install</div>
            <pre className="text-[#FBBF24] bg-[#131522] rounded-lg px-4 py-3 text-sm overflow-x-auto mb-1">
              {installSteps.map(line => <div key={line}>{line}</div>)}
            </pre>
            <span className="text-xs text-white/60">Requires Node.js & pnpm</span>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="text-xl font-bold mb-1 text-white">Resources</h2>
          <ul className="list-disc pl-7 text-white/90">
            <li>
              <a
                href="https://github.com/NautilusOSS/buidl#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#1EAEDB]"
              >
                Project README
              </a>
            </li>
            <li>
              <a
                href="https://nautilus.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#1EAEDB]"
              >
                Nautilus Network
              </a>
            </li>
            <li>
              <a
                href="https://twitter.com/nautilusgm"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#1EAEDB]"
              >
                Twitter @nautilusgm
              </a>
            </li>
          </ul>
        </section>

        <div className="mt-10 bg-[#1EAEDB]/10 border-t border-white/10 pt-5 rounded-b-2xl text-center text-white/80">
          <span className="font-bold text-white">Get involved:</span>{" "}
          Contribute to the protocol or join the community to build the future of onchain work.
        </div>
      </div>
    </div>
  );
};

export default Home;

