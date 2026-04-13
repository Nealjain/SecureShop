interface Props {
  items: { label: string; color?: string }[]
  title?: string
}

const colors: Record<string, string> = {
  blue:   "bg-blue-50 border-blue-200 text-blue-700",
  green:  "bg-green-50 border-green-200 text-green-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  red:    "bg-red-50 border-red-200 text-red-700",
}

export default function SecurityBadge({ items, title = "Security" }: Props) {
  return (
    <div className="rounded-lg border bg-gray-50 border-gray-200 p-3 mt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[item.color || "blue"]}`}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}
