import styles from "./Button.module.css"

export function Button({
	children,
	onClick,
}: {
	children: React.ReactNode
	onClick?: () => void
}) {
	return (
		<button
			className={styles.button}
			type="button"
			onClick={onClick ?? undefined}
		>
			{children}
		</button>
	)
}
