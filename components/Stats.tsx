export default function Stats({ label, value }: { label: string | number; value: string | number }) {
  return <div className="card p-5"><p className="text-sm font-semibold text-white/60">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p></div>;
}
