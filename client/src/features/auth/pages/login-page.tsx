import { LoginForm } from '../components/login-form'

export function LoginPage() {
  return (
    <div className="grid min-h-screen w-full bg-zinc-50 lg:grid-cols-[1fr_0.8fr]">
      <section
        className="relative hidden border-r border-zinc-900 bg-cover bg-center lg:block"
        style={{ backgroundImage: "url('https://www.ritco.rw/assets/images/home_two/hero_thumb_2.png')" }}
      >
        <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[1px]" />
        <div className="relative flex h-full flex-col justify-center p-16 xl:p-24">
          <div className="max-w-xl">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 font-mono text-xl font-bold text-zinc-950 shadow-lg shadow-emerald-500/20">
                RT
              </div>
              <div>
                <p className="text-sm font-bold tracking-tight text-white">Rwanda Transit Ops</p>
                <p className="text-[10px] font-medium tracking-widest text-emerald-400 uppercase">Control Room</p>
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">
              Reliable public transport <br />
              <span className="text-emerald-400">operations management.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-zinc-300">
              Manage companies, map routes, buses, drivers, and users in one secure, unified control room.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-4">
              <Metric label="Companies" value="3+" />
              <Metric label="Routes" value="50+" />
              <Metric label="Fleet" value="100+" />
            </div>
          </div>

          <div className="absolute bottom-10 left-16 xl:left-24">
            <p className="text-xs font-medium text-zinc-500">© 2026 PBS Rwanda Transit. All rights reserved.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-white p-8 lg:bg-zinc-50/30">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 font-mono text-2xl font-bold text-white shadow-lg">
              RT
            </div>
          </div>
          <LoginForm />
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur-md transition-all hover:border-emerald-500/30 hover:bg-white/10">
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold tracking-widest text-emerald-400 uppercase">{label}</p>
    </div>
  )
}
