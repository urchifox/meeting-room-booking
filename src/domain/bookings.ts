import dayjs from "dayjs"

import {
	addBookingToServer,
	deleteBookingFromServer,
	getBookingsFromServer,
	updateBookingOnServer,
} from "../services/serverAdapter"
import type {
	BookingInfo,
	HourMinute,
	ValidationResult,
	YearMonthDay,
} from "../types/types"
import { isValidForBooking } from "./validation"

function convertServerResponceToValidationResult(
	response: { statusCode: 200 } | { statusCode: 404 | 409; message: string }
): ValidationResult {
	if (response.statusCode === 200) {
		return { valid: true }
	}

	return {
		valid: false,
		errors: [response.message],
	}
}

export async function getBookings(date: string): Promise<Array<BookingInfo>> {
	const response = await getBookingsFromServer(date)
	return response.body
}

export function sortBookings(bookings: Array<BookingInfo>): Array<BookingInfo> {
	return [...bookings].sort((a, b) => {
		if (a.date !== b.date) {
			return a.date.localeCompare(b.date)
		}
		return a.timeRange.start.localeCompare(b.timeRange.start)
	})
}

export function excludeBooking(
	bookings: Array<BookingInfo>,
	id: BookingInfo["id"]
): Array<BookingInfo> {
	return [...bookings].filter((booking) => booking.id !== id)
}

export async function tryAddBooking({
	booking,
	otherBookings,
	today,
	currentTime,
}: {
	booking: BookingInfo
	otherBookings: BookingInfo[]
	today: YearMonthDay
	currentTime: HourMinute
}): Promise<ValidationResult> {
	const validationResult = isValidForBooking({
		today,
		currentTime,
		date: booking.date,
		timeRange: booking.timeRange,
		otherBookings,
	})

	if (!validationResult.valid) {
		return Promise.resolve(validationResult)
	}

	const response = await addBookingToServer(booking)
	return convertServerResponceToValidationResult(response)
}

export async function tryUpdateBooking({
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

	if (!validationResult.valid) {
		return Promise.resolve(validationResult)
	}

	const response = await updateBookingOnServer(booking)
	return convertServerResponceToValidationResult(response)
}

export async function tryDeleteBooking(id: string): Promise<ValidationResult> {
	const response = await deleteBookingFromServer(id)
	return convertServerResponceToValidationResult(response)
}
