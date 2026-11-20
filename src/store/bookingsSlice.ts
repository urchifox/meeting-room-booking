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
let lastRequestedDateToActivate: YearMonthDay | null = null

export const loadBookingsForDay = createAsyncThunk<
	Array<BookingInfo>,
	{ date: YearMonthDay; setDay: boolean },
	{ state: RootState; rejectValue: string }
>(
	"bookings/loadBookings",
	async ({ date, setDay }, { getState, dispatch, rejectWithValue, signal }) => {
		if (setDay) {
			lastRequestedDateToActivate = date
		}
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

			const isRequestedDateToActivate = lastRequestedDateToActivate === date
			if (!signal.aborted) {
				dispatch(
					bookingsSlice.actions.setBookings({
						date,
						bookings,
						setDay: isRequestedDateToActivate,
					})
				)
			}
			if (isRequestedDateToActivate) {
				lastRequestedDateToActivate = null
			}
			return bookings
		} catch (_) {
			mapOfLoads.delete(date)
			const isRequestedDateToActivate = lastRequestedDateToActivate === date
			if (isRequestedDateToActivate) {
				lastRequestedDateToActivate = null
			}
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
			await dispatch(loadBookingsForDay({ date: booking.date, setDay: false }))
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
			await dispatch(loadBookingsForDay({ date: booking.date, setDay: false }))
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
		setBookings: (
			state: BookingsState,
			action: PayloadAction<{
				date: YearMonthDay
				bookings: Array<BookingInfo>
				setDay: boolean
			}>
		) => {
			const { date, bookings, setDay } = action.payload
			const sortedBookings = sortBookings(bookings)
			if (state === null) {
				const bookingsByDate: Partial<
					Record<YearMonthDay, Array<BookingInfo>>
				> = {}
				bookingsByDate[date] = sortedBookings
				return {
					activeDate: setDay ? date : getToday(),
					bookingsByDate,
				}
			}
			if (setDay) {
				state.activeDate = date
			}
			state.bookingsByDate[date] = sortedBookings
			return state
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
			const bookingsOfActiveDay = state.bookingsByDate[state.activeDate]
			if (bookingsOfActiveDay === undefined) {
				return
			}
			const id = action.payload
			const booking = bookingsOfActiveDay?.find((item) => item.id === id)
			if (booking === undefined) {
				return
			}
			state.bookingsByDate[state.activeDate] = excludeBooking(
				bookingsOfActiveDay,
				id
			)
		},

		reset: () => {
			mapOfLoads.clear()
			lastRequestedDateToActivate = null
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
export const { reset } = bookingsSlice.actions
export const { selectActiveDate, selectBookingsByDay, selectBookingById } =
	bookingsSlice.selectors
