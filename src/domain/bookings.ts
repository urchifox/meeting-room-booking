import { bookings } from "../mocks/bookings"
import type { BookingInfo } from "../types/types"

export function getBookings(date: string): Promise<Array<BookingInfo>> {
	const filteredBookings = bookings.filter((booking) => booking.date === date)
	return Promise.resolve(filteredBookings)
}

export function addBooking(booking: BookingInfo): Promise<void> {
	console.log("addBooking", booking)
	return Promise.resolve()
}

export function updateBooking(booking: BookingInfo): Promise<void> {
	console.log("updateBooking", booking)
	return Promise.resolve()
}

export function deleteBooking(id: string): Promise<void> {
	console.log("deleteBooking", id)
	return Promise.resolve()
}
