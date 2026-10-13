import { VerifyDisclosure } from "@/components/VerifyDisclosure";
import RetrieveEvidence from "@/components/RetrieveEvidence";
import { EncryptEvidence } from "@/components/EncryptEvidence";
import { ConnectWallet } from "@/components/ConnectWallet";
const features = [
  {
    number: "01",
    href: "#encrypt-evidence",
    title: "Encrypt Evidence",
    description:
      "Protect sensitive evidence locally before it reaches public storage.",
    icon: "🔐",
  },
  {
    number: "02",
    href: "#encrypt-evidence",
    title: "Store on Arkiv",
    description:
      "Publish encrypted records to Arkiv with verifiable entity references.",
    icon: "◈",
  },
  {
    number: "03",
    href: "#retrieve-evidence",
    title: "Retrieve & Decrypt",
    description:
      "Recover evidence using its entity key and your private decryption key.",
    icon: "◇",
  },
  {
    number: "04",
    href: "#retrieve-evidence",
    title: "Selective Disclosure",
    description:
      "Share only the information a recipient needs to see.",
    icon: "↗",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-7xl px-6">
        <header className="flex items-center justify-between border-b border-white/10 py-6">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="Arkiv Vault logo"
              width="40"
              height="40"
              className="h-10 w-10 rounded-xl"
            />
            <div>
              <div className="text-lg font-bold tracking-wider">
                ARKIV VAULT
              </div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                Private Evidence. Verifiable Proof.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className="hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-300 sm:inline-flex">
              Tiramisu Testnet
            </span>
            <ConnectWallet />
          </div>
        </header>

        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative max-w-4xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              ENCRYPTED EVIDENCE INFRASTRUCTURE
            </div>

            <h1 className="text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
              Your evidence.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                Your control.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-400">
              Encrypt sensitive records before storing them on Arkiv.
              Retrieve them securely and control what you disclose.
              No plaintext evidence needs to leave your device.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#workspace"
                className="rounded-xl bg-cyan-400 px-7 py-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Explore Workspace →
              </a>

              <a
                href="#how-it-works"
                className="rounded-xl border border-white/15 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                How It Works
              </a>
            </div>
          </div>
        </section>

        <section id="workspace" className="pb-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                YOUR WORKSPACE
              </p>
              <h2 className="text-3xl font-semibold">
                Evidence Management
              </h2>
            </div>

            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-300">
              Interactive Workspace
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.number}
                className="group rounded-2xl border border-white/10 bg-[#101622] p-7 transition hover:border-cyan-400/40 hover:bg-[#131d2b]"
              >
                <div className="mb-10 flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-2xl text-cyan-300">
                    {feature.icon}
                  </div>
                  <span className="font-mono text-sm text-slate-600">
                    {feature.number}
                  </span>
                </div>

                <h3 className="text-xl font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-3 max-w-sm leading-7 text-slate-400">
                  {feature.description}
                </p>

                <a
                  href={feature.href}
                  className="mt-8 inline-flex text-xs font-semibold uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
                >
                  Open Feature →
                </a>
              </article>
            ))}
          </div>
        </section>

        <div className="space-y-10 pb-24">
          <EncryptEvidence />

          <div id="retrieve-evidence" className="scroll-mt-8">
            <RetrieveEvidence />
          </div>

          <VerifyDisclosure />
        </div>

        <section
          id="how-it-works"
          className="border-t border-white/10 py-20"
        >
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                HOW IT WORKS
              </p>
              <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
                Public storage.
                <br />
                Private content.
              </h2>
            </div>

            <div className="space-y-5 text-slate-400">
              <p>
                Arkiv stores encrypted ciphertext and associated
                metadata. Encryption and decryption happen locally.
              </p>
              <p>
                A successful storage transaction does not reveal
                the original evidence without the decryption key.
              </p>
              <p>
                Arkiv entity expiration should not be treated as
                guaranteed deletion of historical copies.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-8 text-xs text-slate-500">
          <span>© 2026 Arkiv Vault</span>
          <span>Built on Arkiv · Privacy by Design</span>
        </footer>
      </div>
    </main>
  );
}
