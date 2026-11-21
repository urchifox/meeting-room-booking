import {
	type PayloadAction,
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
	bookingsByDate: Partial<Record<YearMonthDay, Array<BookingInfo>>>
} | null

const initialState = null as BookingsState

const mapOfLoads = new Map<YearMonthDay, Promise<Array<BookingInfo>>>()

export const loadBookingsForDay = createAsyncThunk<
	Array<BookingInfo>,
	YearMonthDay,
	{ state: RootState; rejectValue: string }
>(
	"bookings/loadBookingsForDay",
	async (date, { getState, dispatch, rejectWithValue, signal }) => {
		try {
			const bookings = await (async function () {
				const storedBookings = selectBookingsByDay(getState(), date)
				if (storedBookings !== null) {
					return storedBookings
				}

				const existedPromise = mapOfLoads.get(date)
				if (existedPromise !== undefined) {
					return await existedPromise
				}

				const newPromise = getBookings(date)
				mapOfLoads.set(date, newPromise)
				const newBookings = await newPromise
				mapOfLoads.delete(date)
				return newBookings
			})()

			if (!signal.aborted) {
				dispatch(
					bookingsSlice.actions.setBookingsForDate({
						date,
						bookings,
					})
				)
			}
			return bookings
		} catch (_) {
			mapOfLoads.delete(date)
			return rejectWithValue("Failed to load bookings")
		}
	}
)

export const addBooking = createAsyncThunk<
	ValidationResult,
	BookingInfo,
	{ state: RootState; rejectValue: Array<string> | string }
>(
	"bookings/addBooking",
	async (booking, { dispatch, rejectWithValue, getState }) => {
		let bookingsOfDate = selectBookingsByDay(getState(), booking.date)
		if (bookingsOfDate === null) {
			await dispatch(loadBookingsForDay(booking.date))
			bookingsOfDate = selectBookingsByDay(getState(), booking.date)
			if (bookingsOfDate === null) {
				return rejectWithValue("Bookings not found")
			}
		}
		const otherBookings = excludeBooking(bookingsOfDate, booking.id)
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
		let bookingsOfDate = selectBookingsByDay(getState(), booking.date)
		if (bookingsOfDate === null) {
			await dispatch(loadBookingsForDay(booking.date))
			bookingsOfDate = selectBookingsByDay(getState(), booking.date)
			if (bookingsOfDate === null) {
				return rejectWithValue("Bookings not found")
			}
		}
		const otherBookings = excludeBooking(bookingsOfDate, booking.id)
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
			state.activeDate = action.payload
		},

		setBookingsForDate: (
			state: BookingsState,
			action: PayloadAction<{
				date: YearMonthDay
				bookings: Array<BookingInfo>
			}>
		) => {
			const { date, bookings } = action.payload
			const sortedBookings = sortBookings(bookings)
			if (state === null) {
				const bookingsByDate: Partial<
					Record<YearMonthDay, Array<BookingInfo>>
				> = {}
				bookingsByDate[date] = sortedBookings
				return {
					activeDate: getToday(),
					bookingsByDate,
				}
			}

			state.bookingsByDate[date] = sortedBookings
		},

		addBooking: (state: BookingsState, action: PayloadAction<BookingInfo>) => {
			if (state === null) {
				return
			}
			const bookingDate = action.payload.date
			const bookingsOfDate = state.bookingsByDate[bookingDate]
			if (bookingsOfDate === undefined) {
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
			const booking = action.payload
			const activeDate = state.activeDate
			const updatedDate = booking.date

			const bookingsOfActiveDay = state.bookingsByDate[activeDate]
			if (bookingsOfActiveDay === undefined) {
				return
			}
			state.bookingsByDate[activeDate] = excludeBooking(
				bookingsOfActiveDay,
				booking.id
			)

			const bookingsOfUpdatedDay = state.bookingsByDate[updatedDate]
			if (bookingsOfUpdatedDay === undefined) {
				return
			}
			state.bookingsByDate[updatedDate] = sortBookings([
				...bookingsOfUpdatedDay,
				booking,
			])
		},

		deleteBooking: (state: BookingsState, action: PayloadAction<string>) => {
			if (state === null) {
				return
			}

			const id = action.payload
			const allBookings = Object.values(state.bookingsByDate).flat()
			const requestedBooking = allBookings.find((item) => item?.id === id)
			if (requestedBooking === undefined) {
				return
			}

			const bookingsOfDate = state.bookingsByDate[requestedBooking.date]
			if (bookingsOfDate === undefined) {
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
		selectBookingById: (state, date: YearMonthDay, id: BookingInfo["id"]) =>
			state?.bookingsByDate[date]?.find((booking) => booking.id === id) ?? null,
	},
})

export const bookingsReducer = bookingsSlice.reducer
export const { activateDate, reset } = bookingsSlice.actions
export const { selectActiveDate, selectBookingsByDay, selectBookingById } =
	bookingsSlice.selectors
