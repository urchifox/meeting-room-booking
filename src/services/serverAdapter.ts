// mock data and functions for server adapter
import type { BookingInfo } from "../types/types"

const seedBookings: Array<BookingInfo> = [
	{
		id: "1",
		date: "2026-10-28",
		timeRange: { start: "10:00", end: "11:00" },
		title: "Meeting with John",
	},
	{
		id: "2",
		date: "2026-10-28",
		timeRange: { start: "11:00", end: "12:00" },
	},
	{
		id: "3",
		date: "2026-10-29",
		timeRange: { start: "13:00", end: "14:00" },
	},
]

type SuccessResponse<Body> = {
	statusCode: 200
	body: Body
}

const BOOKING_NOT_FOUND = "Booking was not found"
const BOOKING_ALREADY_EXISTS = "A booking with this id already exists"

type NotFoundResponse = {
	statusCode: 404
	message: string
}

type ConflictResponse = {
	statusCode: 409
	message: string
}

function copyBooking(booking: BookingInfo): BookingInfo {
	const copy: BookingInfo = {
		id: booking.id,
		date: booking.date,
		timeRange: {
			start: booking.timeRange.start,
			end: booking.timeRange.end,
		},
	}

	if (booking.title !== undefined) {
		copy.title = booking.title
	}

	return copy
}

const bookings: Array<BookingInfo> = seedBookings.map(copyBooking)

export function getBookingsFromServer(
	date: string
): Promise<SuccessResponse<Array<BookingInfo>>> {
	const filteredBookings = bookings
		.filter((booking) => booking.date === date)
		.map(copyBooking)

	return Promise.resolve({
		statusCode: 200,
		body: filteredBookings,
	})
}

export function addBookingToServer(
	booking: BookingInfo
): Promise<SuccessResponse<BookingInfo> | ConflictResponse> {
	const isExistingBooking = bookings.some((item) => item.id === booking.id)
	if (isExistingBooking) {
		return Promise.resolve({
			statusCode: 409,
			message: BOOKING_ALREADY_EXISTS,
		})
	}

	const storedBooking = copyBooking(booking)
	bookings.push(storedBooking)

	return Promise.resolve({
		statusCode: 200,
		body: copyBooking(storedBooking),
	})
}

export function updateBookingOnServer(
	booking: BookingInfo
): Promise<SuccessResponse<BookingInfo> | NotFoundResponse> {
	const index = bookings.findIndex((item) => item.id === booking.id)
	if (index === -1) {
		return Promise.resolve({
			statusCode: 404,
			message: BOOKING_NOT_FOUND,
		})
	}

	const storedBooking = copyBooking(booking)
	bookings[index] = storedBooking

	return Promise.resolve({
		statusCode: 200,
		body: copyBooking(storedBooking),
	})
}

export function deleteBookingFromServer(
	id: string
): Promise<{ statusCode: 200 } | NotFoundResponse> {
	const index = bookings.findIndex((item) => item.id === id)
	if (index === -1) {
		return Promise.resolve({
			statusCode: 404,
			message: BOOKING_NOT_FOUND,
		})
	}

	bookings.splice(index, 1)

	return Promise.resolve({
		statusCode: 200,
	})
}
