export default function Stats({ label, value }: { label: string; value: string | number }) {
  return <div className="card p-5"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>;
}
