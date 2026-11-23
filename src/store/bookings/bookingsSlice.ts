import {
	type PayloadAction,
	type UnknownAction,
	createSlice,
	isFulfilled,
	isPending as isPendingAction,
	isRejected,
} from "@reduxjs/toolkit"

import { excludeBooking, sortBookings } from "../../domain/bookings"
import { getToday } from "../../domain/date"
import { type BookingInfo, type YearMonthDay } from "../../types/types"
import { type BookingsState, BookingsStatus, BookingsThunkType } from "./types"

const MUTATION_THUNK_TYPES = [
	BookingsThunkType.ADD,
	BookingsThunkType.UPDATE,
	BookingsThunkType.DELETE,
] as const

const initialState = {
	activeDate: getToday(),
	bookingsByDate: {},
	isMutationPending: false,
} as BookingsState

export const bookingsSlice = createSlice({
	name: "bookings",
	initialState,
	reducers: {
		activateDate: (
			state: BookingsState,
			action: PayloadAction<YearMonthDay>
		) => {
			;(Object.keys(state.bookingsByDate) as Array<YearMonthDay>).forEach(
				(date) => {
					const bookings = getBookingsByDay(state, date)
					if (bookings === BookingsStatus.ERROR) {
						delete state.bookingsByDate[date]
					}
				}
			)
			state.activeDate = action.payload
		},

		setBookingsForDate: (
			state: BookingsState,
			action: PayloadAction<{
				date: YearMonthDay
				bookings: Array<BookingInfo> | BookingsStatus
			}>
		) => {
			const { date, bookings } = action.payload
			const valueToSet = Array.isArray(bookings)
				? sortBookings(bookings)
				: bookings
			state.bookingsByDate[date] = valueToSet
		},

		removeBookingsForDate: (
			state: BookingsState,
			action: PayloadAction<YearMonthDay>
		) => {
			delete state.bookingsByDate[action.payload]
		},

		addBooking: (state: BookingsState, action: PayloadAction<BookingInfo>) => {
			const bookingDate = action.payload.date
			const bookingsOfDate = getBookingsByDay(state, bookingDate)
			if (!Array.isArray(bookingsOfDate)) {
				return
			}
			bookingsOfDate.push(action.payload)
			state.bookingsByDate[bookingDate] = sortBookings(bookingsOfDate)
		},

		updateBooking: (
			state: BookingsState,
			action: PayloadAction<BookingInfo>
		) => {
			const updatedBooking = action.payload

			const requestedBooking = getBookingById(state, updatedBooking.id)
			if (requestedBooking === null) {
				return
			}

			const initialDate = requestedBooking.date
			const bookingsOfInitialDay = getBookingsByDay(state, initialDate)
			if (!Array.isArray(bookingsOfInitialDay)) {
				return
			}
			state.bookingsByDate[initialDate] = excludeBooking(
				bookingsOfInitialDay,
				updatedBooking.id
			)

			const updatedDate = updatedBooking.date
			const bookingsOfUpdatedDay = getBookingsByDay(state, updatedDate)
			if (!Array.isArray(bookingsOfUpdatedDay)) {
				return
			}
			state.bookingsByDate[updatedDate] = sortBookings([
				...bookingsOfUpdatedDay,
				updatedBooking,
			])
		},

		deleteBooking: (state: BookingsState, action: PayloadAction<string>) => {
			const id = action.payload
			const requestedBooking = getBookingById(state, id)
			if (requestedBooking === null) {
				return
			}

			const bookingsOfDate = getBookingsByDay(state, requestedBooking.date)
			if (!Array.isArray(bookingsOfDate)) {
				return
			}
			state.bookingsByDate[requestedBooking.date] = excludeBooking(
				bookingsOfDate,
				id
			)
		},

		reset: () => initialState,
	},

	extraReducers: (builder) => {
		builder
			.addMatcher(
				(action): action is UnknownAction =>
					isPendingAction(action) && isMutationAction(action, "pending"),
				(state) => {
					state.isMutationPending = true
				}
			)
			.addMatcher(
				(action): action is UnknownAction =>
					isFulfilled(action) && isMutationAction(action, "fulfilled"),
				(state) => {
					state.isMutationPending = false
				}
			)
			.addMatcher(
				(action): action is UnknownAction =>
					isRejected(action) && isMutationAction(action, "rejected"),
				(state) => {
					state.isMutationPending = false
				}
			)
	},

	selectors: {
		selectIsMutationPending: isMutationPending,
		selectActiveDate: getActiveDate,
		selectBookingsByDay: getBookingsByDay,
		selectBookingById: getBookingById,
	},
})

function isMutationAction(
	action: UnknownAction,
	status: "pending" | "fulfilled" | "rejected"
) {
	return MUTATION_THUNK_TYPES.some(
		(type) => action.type === `${type}/${status}`
	)
}

function isMutationPending(state: BookingsState) {
	return state.isMutationPending
}

function getActiveDate(state: BookingsState) {
	return state.activeDate ?? getToday()
}

function getBookingsByDay(state: BookingsState, date: YearMonthDay) {
	return state.bookingsByDate[date] ?? null
}

function getBookingById(
	state: BookingsState,
	id: BookingInfo["id"],
	date?: YearMonthDay
) {
	const bookingsToSearch =
		date === undefined
			? Object.values(state.bookingsByDate)
					.flat()
					.filter((item) => typeof item !== "string" && item !== undefined)
			: getBookingsByDay(state, date)
	if (!Array.isArray(bookingsToSearch)) {
		return null
	}
	return (
		bookingsToSearch.find(
			(booking) => typeof booking !== "string" && booking?.id === id
		) ?? null
	)
}

export const bookingsReducer = bookingsSlice.reducer
export const { activateDate, reset } = bookingsSlice.actions
export const {
	selectIsMutationPending,
	selectActiveDate,
	selectBookingsByDay,
	selectBookingById,
} = bookingsSlice.selectors
