import { readFileSync } from "node:fs"
import { join } from "node:path"

export const alt = "OKRs - Team goal tracking for startups"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
	const image = readFileSync(join(process.cwd(), "public", "opengraph.png"))
	return new Response(image, { headers: { "Content-Type": "image/png" } })
}
