import styles from "./BookingsList.module.css"

import type { BookingInfo } from "../../types/types"
import { BookingItem } from "../BookingItem/BookingItem"

export function BookingsList({
	bookings,
	onEditClick,
}: {
	bookings: Array<BookingInfo>
	onEditClick: (booking: BookingInfo) => void
}) {
	const items = bookings.map((booking) => {
		return (
			<BookingItem
				key={booking.id}
				booking={booking}
				onEditClick={onEditClick}
			/>
		)
	})

	return <ul className={styles.bookingsList}>{items}</ul>
}
