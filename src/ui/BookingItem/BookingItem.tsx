import styles from "./BookingItem.module.css"

import { selectIsMutationPending } from "../../store/bookingsSlice"
import type { BookingInfo } from "../../types/types"
import { Button } from "../Button/Button"
import { useAppSelector } from "../hooks/store"

export function BookingItem({
	booking,
	onDeleteClick,
	onEditClick,
}: {
	booking: BookingInfo
	onDeleteClick: (id: string) => void
	onEditClick: (booking: BookingInfo) => void
}) {
	const isMutationPending = useAppSelector(selectIsMutationPending)
	return (
		<li className={styles.bookingItem}>
			{booking.title && <h2>{booking.title}</h2>}
			<p>{booking.date}</p>
			<p>{booking.timeRange.start}</p>
			<p>{booking.timeRange.end}</p>
			<Button onClick={() => onEditClick(booking)} disabled={isMutationPending}>
				Edit
			</Button>
			<Button
				onClick={() => onDeleteClick(booking.id)}
				disabled={isMutationPending}
			>
				Delete
			</Button>
		</li>
	)
}
