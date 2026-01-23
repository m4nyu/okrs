import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4 px-4">
        <h1 className="text-sm font-medium text-foreground">Not Found</h1>
        <p className="text-sm text-muted-foreground">This objective doesn&apos;t exist or is not public.</p>
        <Link href="/" className="inline-block text-sm text-muted-foreground hover:text-foreground">
          Go back
        </Link>
      </div>
    </div>
  )
}
