import styles from "./Modal.module.css"

import { useEffect, useRef } from "react"

import { Button } from "../Button/Button"

export function Modal({
	children,
	isOpen,
	onClose,
}: {
	children: React.ReactNode
	isOpen: boolean
	onClose: () => void
}) {
	const dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) {
			return
		}

		if (isOpen) {
			if (!dialog.open) {
				dialog.showModal()
			}
		} else if (dialog.open) {
			dialog.close()
		}
	}, [isOpen])

	return (
		<dialog ref={dialogRef} className={styles.modal} onClose={onClose}>
			{children}
			<Button
				onClick={() => {
					dialogRef.current?.close()
				}}
			>
				Close
			</Button>
		</dialog>
	)
}
