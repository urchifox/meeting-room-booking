import styles from "./App.module.css"

import { PageBooking } from "../PageBooking/PageBooking"

export function App() {
	return (
		<div className={styles.app}>
			<PageBooking />
		</div>
	)
}
