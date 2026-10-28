import dayjs from "dayjs"

import { bookings } from "../mocks/bookings"
import type { BookingInfo, HourMinute, ValidationResult, YearMonthDay } from "../types/types"
import { isValidForBooking } from "./validation"

export function getBookings(date: string): Promise<Array<BookingInfo>> {
	const filteredBookings = bookings.filter((booking) => booking.date === date)
	return Promise.resolve(filteredBookings)
}

export function addBooking({
	booking,
	otherBookings,
}: {
	booking: BookingInfo
	otherBookings: BookingInfo[]
}): Promise<ValidationResult> {
	const today = dayjs().format("YYYY-MM-DD") as YearMonthDay
	const currentTime = dayjs().format("HH:mm") as HourMinute

	const validationResult = isValidForBooking({
		today,
		currentTime,
		date: booking.date,
		timeRange: booking.timeRange,
		otherBookings,
	})

	return Promise.resolve(validationResult)
}

export function updateBooking({
	booking,
	otherBookings,
}: {
	booking: BookingInfo
	otherBookings: BookingInfo[]
}): Promise<ValidationResult> {
	const today = dayjs().format("YYYY-MM-DD") as YearMonthDay
	const currentTime = dayjs().format("HH:mm") as HourMinute

	const validationResult = isValidForBooking({
		today,
		currentTime,
		date: booking.date,
		timeRange: booking.timeRange,
		otherBookings,
	})

	return Promise.resolve(validationResult)
}

export function deleteBooking(id: string): Promise<void> {
	console.log("deleteBooking", id)
	return Promise.resolve()
}
