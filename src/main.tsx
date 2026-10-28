import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "./ui/App/App"

const rootElement = document.getElementById("root")

if (rootElement === null) {
	throw new Error(
		'Root element not found. Add <div id="root"></div> to index.html.'
	)
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>
)
