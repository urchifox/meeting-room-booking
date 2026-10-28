import styles from "./BookingItem.module.css"

import type { BookingInfo } from "../../types/types"
import { Button } from "../Button/Button"
import { deleteBooking } from "../../domain/bookings"

export function BookingItem({
	booking,
	onEditClick,
}: {
	booking: BookingInfo
	onEditClick: (booking: BookingInfo) => void
}) {
	return (
		<li className={styles.bookingItem}>
			{booking.title && <h2>{booking.title}</h2>}
			<p>{booking.date}</p>
			<p>{booking.timeRange.start}</p>
			<p>{booking.timeRange.end}</p>
			<Button onClick={() => onEditClick(booking)}>Edit</Button>
			<Button onClick={() => void deleteBooking(booking.id)}>Delete</Button>
		</li>
	)
}
