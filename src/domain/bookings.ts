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
	const response = await getBookingsFromServer(date);
	return response.body;
}

export async function tryAddBooking({
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

	const response = await addBookingToServer(booking);
	return convertServerResponceToValidationResult(response);
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

	const response = await updateBookingOnServer(booking);
	return convertServerResponceToValidationResult(response);
}

export async function tryDeleteBooking(id: string): Promise<ValidationResult> {
	const response = await deleteBookingFromServer(id);
	return convertServerResponceToValidationResult(response);
}
