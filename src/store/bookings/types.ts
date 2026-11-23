import type { BookingInfo, YearMonthDay } from "../../types/types"

export type BookingsState = {
	activeDate: YearMonthDay
	bookingsByDate: BookingsByDate
	isMutationPending: boolean
}

export type BookingsByDate = Partial<
	Record<YearMonthDay, Array<BookingInfo> | BookingsStatus>
>

export enum BookingsStatus {
	LOADING = "LOADING",
	ERROR = "ERROR",
}
export enum BookingsThunkType {
	LOAD_FOR_DAY = "bookings/loadBookingsForDay",
	RETRY_LOAD_FOR_DAY = "bookings/retryLoadBookingsForDay",
	ADD = "bookings/addBooking",
	UPDATE = "bookings/updateBooking",
	DELETE = "bookings/deleteBooking",
}
