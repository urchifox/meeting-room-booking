import styles from "./Button.module.css"

export function Button({
	children,
	onClick,
	disabled,
}: {
	children: React.ReactNode
	onClick?: () => void
	disabled?: boolean
}) {
	return (
		<button
			className={styles.button}
			type="button"
			onClick={onClick ?? undefined}
			disabled={disabled ?? false}
		>
			{children}
		</button>
	)
}
