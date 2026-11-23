import {
	type PayloadAction,
	type ThunkDispatch,
	type UnknownAction,
	createAsyncThunk,
	createSlice,
} from "@reduxjs/toolkit"

import type { RootState } from "."
import {
	excludeBooking,
	getBookings,
	sortBookings,
	tryAddBooking,
	tryDeleteBooking,
	tryUpdateBooking,
} from "../domain/bookings"
import { getCurrentTime, getToday } from "../domain/date"
import type {
	BookingInfo,
	ValidationResult,
	YearMonthDay,
} from "../types/types"

export type BookingsState = {
	activeDate: YearMonthDay
	bookingsByDate: BookingsByDate
} | null

type BookingsByDate = Partial<
	Record<YearMonthDay, Array<BookingInfo> | BookingsStatus>
>

export enum BookingsStatus {
	LOADING = "LOADING",
	ERROR = "ERROR",
}

const initialState = null as BookingsState

const mapOfLoads = new Map<YearMonthDay, Promise<Array<BookingInfo>>>()

export const loadBookingsForDay = createAsyncThunk<
	Array<BookingInfo>,
	YearMonthDay,
	{ state: RootState; rejectValue: string }
>(
	"bookings/loadBookingsForDay",
	async (date, { getState, dispatch, rejectWithValue, signal }) => {
		const onFulfilled = (result: Array<BookingInfo> | BookingsStatus) => {
			onLoadFulfilled({
				result,
				date,
				dispatch,
				getState,
				aborted: signal.aborted,
			})
		}

		try {
			const bookings = await (async function () {
				const storedBookings = selectBookingsByDay(getState(), date)
				if (Array.isArray(storedBookings)) {
					return storedBookings
				}

				const existedPromise = mapOfLoads.get(date)
				if (existedPromise !== undefined) {
					return await existedPromise
				}

				dispatch(
					bookingsSlice.actions.setBookingsForDate({
						date,
						bookings: BookingsStatus.LOADING,
					})
				)

				const newPromise = getBookings(date)
				mapOfLoads.set(date, newPromise)
				const newBookings = await newPromise
				mapOfLoads.delete(date)
				return newBookings
			})()

			onFulfilled(bookings)
			return bookings
		} catch (_) {
			mapOfLoads.delete(date)
			onFulfilled(BookingsStatus.ERROR)
			return rejectWithValue("Failed to load bookings")
		}
	}
)

function onLoadFulfilled({
	result,
	date,
	dispatch,
	getState,
	aborted,
}: {
	result: Array<BookingInfo> | BookingsStatus
	date: YearMonthDay
	dispatch: ThunkDispatch<RootState, unknown, UnknownAction>
	getState: () => RootState
	aborted: boolean
}) {
	if (aborted) {
		if (selectBookingsByDay(getState(), date) === BookingsStatus.LOADING) {
			dispatch(bookingsSlice.actions.removeBookingsForDate(date))
		}
	} else {
		dispatch(
			bookingsSlice.actions.setBookingsForDate({
				date,
				bookings: result,
			})
		)
	}
}

export const addBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ state: RootState; rejectValue: Array<string> | string }
>(
	"bookings/addBooking",
	async (booking, { dispatch, rejectWithValue, getState }) => {
		const otherBookings = await getOtherBookings({
			booking,
			dispatch,
			getState,
		})
		if (otherBookings === null) {
			return rejectWithValue("Bookings not found")
		}

		try {
			const result = await tryAddBooking({
				booking,
				otherBookings,
				today: getToday(),
				currentTime: getCurrentTime(),
			})
			if (!result.valid) {
				return rejectWithValue(result.errors)
			}
			dispatch(bookingsSlice.actions.addBooking(booking))
			return result
		} catch (_) {
			return rejectWithValue("Failed to add booking")
		}
	}
)

export const updateBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ state: RootState; rejectValue: Array<string> | string }
>(
	"bookings/updateBooking",
	async (booking, { dispatch, rejectWithValue, getState }) => {
		const otherBookings = await getOtherBookings({
			booking,
			dispatch,
			getState,
		})
		if (otherBookings === null) {
			return rejectWithValue("Bookings not found")
		}

		try {
			const result = await tryUpdateBooking({
				booking,
				otherBookings,
			})
			if (!result.valid) {
				return rejectWithValue(result.errors)
			}
			dispatch(bookingsSlice.actions.updateBooking(booking))
			return result
		} catch (_) {
			return rejectWithValue("Failed to update booking")
		}
	}
)

async function getOtherBookings({
	booking,
	dispatch,
	getState,
}: {
	booking: BookingInfo
	dispatch: ThunkDispatch<RootState, unknown, UnknownAction>
	getState: () => RootState
}) {
	let bookingsOfDate = selectBookingsByDay(getState(), booking.date)

	if (!Array.isArray(bookingsOfDate)) {
		await dispatch(loadBookingsForDay(booking.date))
		bookingsOfDate = selectBookingsByDay(getState(), booking.date)
		if (!Array.isArray(bookingsOfDate)) {
			return null
		}
	}

	const otherBookings = excludeBooking(bookingsOfDate, booking.id)
	return otherBookings
}

export const deleteBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo["id"],
	{ rejectValue: Array<string> | string }
>("bookings/deleteBooking", async (id, { dispatch, rejectWithValue }) => {
	try {
		const result = await tryDeleteBooking(id)
		if (!result.valid) {
			return rejectWithValue(result.errors)
		}
		dispatch(bookingsSlice.actions.deleteBooking(id))
		return result
	} catch (_) {
		return rejectWithValue("Failed to delete booking")
	}
})

const bookingsSlice = createSlice({
	name: "bookings",
	initialState,
	reducers: {
		activateDate: (
			state: BookingsState,
			action: PayloadAction<YearMonthDay>
		) => {
			if (state === null) {
				return {
					activeDate: action.payload,
					bookingsByDate: {},
				}
			}
			;(Object.keys(state.bookingsByDate) as Array<YearMonthDay>).forEach(
				(date) => {
					const bookings = state.bookingsByDate[date]
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
			if (state === null) {
				const bookingsByDate: BookingsByDate = {}
				bookingsByDate[date] = valueToSet
				return {
					activeDate: getToday(),
					bookingsByDate,
				}
			}

			state.bookingsByDate[date] = valueToSet
		},

		removeBookingsForDate: (
			state: BookingsState,
			action: PayloadAction<YearMonthDay>
		) => {
			if (state === null) {
				return
			}
			delete state.bookingsByDate[action.payload]
		},

		addBooking: (state: BookingsState, action: PayloadAction<BookingInfo>) => {
			if (state === null) {
				return
			}
			const bookingDate = action.payload.date
			const bookingsOfDate = state.bookingsByDate[bookingDate]
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
			if (state === null) {
				return
			}
			const updatedBooking = action.payload

			const requestedBooking = findBookingById(state, updatedBooking.id)
			if (requestedBooking === null) {
				return
			}

			const initialDate = requestedBooking.date
			const bookingsOfInitialDay = state.bookingsByDate[initialDate]
			if (!Array.isArray(bookingsOfInitialDay)) {
				return
			}
			state.bookingsByDate[initialDate] = excludeBooking(
				bookingsOfInitialDay,
				updatedBooking.id
			)

			const updatedDate = updatedBooking.date
			const bookingsOfUpdatedDay = state.bookingsByDate[updatedDate]
			if (!Array.isArray(bookingsOfUpdatedDay)) {
				return
			}
			state.bookingsByDate[updatedDate] = sortBookings([
				...bookingsOfUpdatedDay,
				updatedBooking,
			])
		},

		deleteBooking: (state: BookingsState, action: PayloadAction<string>) => {
			if (state === null) {
				return
			}

			const id = action.payload
			const requestedBooking = findBookingById(state, id)
			if (requestedBooking === null) {
				return
			}

			const bookingsOfDate = state.bookingsByDate[requestedBooking.date]
			if (!Array.isArray(bookingsOfDate)) {
				return
			}
			state.bookingsByDate[requestedBooking.date] = excludeBooking(
				bookingsOfDate,
				id
			)
		},

		reset: () => {
			mapOfLoads.clear()
			return initialState
		},
	},

	selectors: {
		selectActiveDate: (state) => state?.activeDate ?? getToday(),
		selectBookingsByDay: (state, date: YearMonthDay) =>
			state?.bookingsByDate[date] ?? null,
		selectBookingById: (state, date: YearMonthDay, id: BookingInfo["id"]) => {
			const bookings = state?.bookingsByDate[date]
			if (!Array.isArray(bookings)) {
				return null
			}
			return bookings.find((booking) => booking.id === id) ?? null
		},
	},
})

function findBookingById(state: BookingsState, id: BookingInfo["id"]) {
	if (state === null) {
		return null
	}
	const allBookings = Object.values(state.bookingsByDate).flat()
	const requestedBooking = allBookings.find(
		(item) => typeof item !== "string" && item?.id === id
	)
	if (requestedBooking === undefined || typeof requestedBooking === "string") {
		return null
	}
	return requestedBooking
}

export const bookingsReducer = bookingsSlice.reducer
export const { activateDate, reset } = bookingsSlice.actions
export const { selectActiveDate, selectBookingsByDay, selectBookingById } =
	bookingsSlice.selectors
