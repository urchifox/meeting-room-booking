import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"

import { store } from "./store/index.ts"
import { App } from "./ui/App/App"

const rootElement = document.getElementById("root")

if (rootElement === null) {
	throw new Error(
		'Root element not found. Add <div id="root"></div> to index.html.'
	)
}

createRoot(rootElement).render(
	<StrictMode>
		<Provider store={store}>
			<App />
		</Provider>
	</StrictMode>
)
