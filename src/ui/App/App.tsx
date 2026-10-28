import styles from "./App.module.css"

import { PageBooking } from "../pageBooking/PageBooking"

export function App() {
	return (
		<div className={styles.app}>
			<PageBooking />
		</div>
	)
}
