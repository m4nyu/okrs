import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-background">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  )
}
