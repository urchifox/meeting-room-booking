import styles from "./BookingsList.module.css"

import type { BookingInfo } from "../../types/types"
import { BookingItem } from "../BookingItem/BookingItem"

export function BookingsList({
	bookings,
	onDeleteClick,
	onEditClick,
}: {
	bookings: Array<BookingInfo>
	onDeleteClick: (id: string) => void
	onEditClick: (booking: BookingInfo) => void
}) {
	const items = bookings.map((booking) => {
		return (
			<BookingItem
				key={booking.id}
				booking={booking}
				onDeleteClick={onDeleteClick}
				onEditClick={onEditClick}
			/>
		)
	})

	return <ul className={styles.bookingsList}>{items}</ul>
}
